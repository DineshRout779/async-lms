const pool = require('../config/pg');
const path = require('path');
const fs = require('fs').promises;

// 1. Get all published subjects
exports.getAllSubjects = async (req, res) => {
  try {
    // Note: We use order_index to keep your curated order
    const { rows } = await pool.query(
      'SELECT * FROM subjects ORDER BY order_index ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error | getAllSubjects:', err);
    res.status(500).json({ message: 'Error fetching subjects' });
  }
};

// 2. Get all published subjects
exports.getAllPublishedSubjects = async (req, res) => {
  try {
    // Note: We use order_index to keep your curated order
    const { rows } = await pool.query(
      'SELECT id, name, slug, description FROM subjects WHERE is_published = true ORDER BY order_index ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error | getAllSubjects:', err);
    res.status(500).json({ message: 'Error fetching subjects' });
  }
};

// 2. Get a course with its nested topics and subtopics
exports.getCourseStructure = async (req, res) => {
  try {
    const { slug } = req.params;

    // Fetch subject info
    const subjectResult = await pool.query(
      'SELECT id, name, description FROM subjects WHERE slug = $1 AND is_published = true',
      [slug]
    );

    if (subjectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const subject = subjectResult.rows[0];

    // Fetch the structure (Topics -> Subtopics)
    // No changes needed here, PG handles UUID equality automatically
    const query = `
      SELECT 
        t.id AS topic_id,
        t.title AS topic_title,
        st.id AS subtopic_id,
        st.title AS subtopic_title,
        st.slug AS subtopic_slug
      FROM topics t
      LEFT JOIN subtopics st ON t.id = st.topic_id
      WHERE t.subject_id = $1
      ORDER BY t.order_index ASC, st.order_index ASC;
    `;

    const { rows } = await pool.query(query, [subject.id]);

    const structure = rows.reduce((acc, row) => {
      let topic = acc.find((t) => t.id === row.topic_id);
      if (!topic) {
        topic = {
          id: row.topic_id, // This is now a UUID string
          title: row.topic_title,
          subtopics: [],
        };
        acc.push(topic);
      }
      if (row.subtopic_id) {
        topic.subtopics.push({
          id: row.subtopic_id, // This is now a UUID string
          title: row.subtopic_title,
          slug: row.subtopic_slug,
        });
      }
      return acc;
    }, []);

    res.json({
      success: true,
      name: subject.name,
      description: subject.description,
      data: structure,
    });
  } catch (err) {
    console.error('Error | getCourseStructure:', err);
    res.status(500).json({ message: 'Error fetching course structure' });
  }
};

// 3. Get content for a specific subtopic
exports.getSubtopicContent = async (req, res) => {
  try {
    const { subtopicSlug } = req.params;

    // We join with lesson_content and order by version to get the latest
    const query = `
      SELECT 
        s.title, 
        s.description as subtopic_description,
        lc.markdown_path,
        lc.content_type,
        lc.estimated_read_time
      FROM public.subtopics s
      LEFT JOIN public.lesson_content lc ON s.id = lc.subtopic_id
      WHERE s.slug = $1 AND (lc.is_published = true OR lc.is_published IS NULL)
      ORDER BY lc.version DESC
      LIMIT 1;
    `;

    const { rows } = await pool.query(query, [subtopicSlug]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const row = rows[0];
    let markdownText = '';

    if (row.markdown_path) {
      try {
        // Updated path resolution to be more robust
        const absolutePath = path.resolve(
          __dirname,
          '../../data/content', // Adjust based on your actual folder structure
          row.markdown_path
        );

        markdownText = await fs.readFile(absolutePath, 'utf8');
      } catch (fileErr) {
        console.error(`File Read Error: ${row.markdown_path}`, fileErr);
        markdownText = '# Error\nContent file could not be loaded.';
      }
    }

    res.json({
      success: true,
      data: {
        title: row.title,
        description: row.subtopic_description,
        markdown_content: markdownText,
        content_type: row.content_type,
        read_time: row.estimated_read_time,
      },
    });
  } catch (err) {
    console.error('Error | getSubtopicContent:', err);
    res.status(500).json({ message: 'Error fetching content' });
  }
};

// 4. Create a new subject
exports.createSubject = async (req, res) => {
  const { name, slug, description } = req.body;

  // Basic validation
  if (!name || !slug) {
    return res.status(400).json({
      success: false,
      message: 'Name and Slug are required.',
    });
  }

  try {
    const query = `
      INSERT INTO public.subjects (name, slug, description, is_published, order_index)
      VALUES ($1, $2, $3, true, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM subjects))
      RETURNING id, name, slug, description, created_at;
    `;

    const values = [name, slug, description];
    const { rows } = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: rows[0],
    });
  } catch (err) {
    console.error('Error | createSubject:', err);

    // Handle unique constraint violation for the slug
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A subject with this slug already exists.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating subject',
      error: err.message,
    });
  }
};

// Update existing subject (Edit & Publish)
exports.updateSubject = async (req, res) => {
  const { id } = req.params;
  const { name, slug, description, is_published } = req.body;
  try {
    const query = `
      UPDATE public.subjects 
      SET name = $1, slug = $2, description = $3, is_published = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 
      RETURNING *`;
    const values = [name, slug, description, is_published, id];
    const result = await pool.query(query, values);

    if (result.rowCount === 0)
      return res.status(404).json({ message: 'Subject not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete subject
exports.deleteSubject = async (req, res) => {
  const { id } = req.params;
  try {
    // Note: Due to ON DELETE CASCADE in schema, this will also remove associated topics/subtopics
    const result = await pool.query(
      'DELETE FROM public.subjects WHERE id = $1',
      [id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ message: 'Subject not found' });
    res
      .status(200)
      .json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
