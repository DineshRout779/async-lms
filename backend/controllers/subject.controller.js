const pool = require('../config/pg');
const path = require('path');
const fs = require('fs').promises;

// 1. Get all published subjects
exports.getAllSubjects = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, slug, description FROM subjects WHERE is_published = true ORDER BY order_index ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
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
          id: row.topic_id,
          title: row.topic_title,
          subtopics: [],
        };
        acc.push(topic);
      }
      if (row.subtopic_id) {
        topic.subtopics.push({
          id: row.subtopic_id,
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

// 3. Get content for a specific subtopic (Joins lesson_content)
exports.getSubtopicContent = async (req, res) => {
  try {
    const { subtopicSlug } = req.params;

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

    // Read the file content from the server's data folder
    if (row.markdown_path) {
      try {
        // Construct absolute path: project_root/data/content/path_from_db
        const absolutePath = path.join(
          __dirname,
          '..',
          'data',
          row.markdown_path
        );
        markdownText = await fs.readFile(absolutePath, 'utf8');
      } catch (fileErr) {
        console.error(`File Read Error for ${row.markdown_path}:`, fileErr);
        markdownText = '# Error\nContent file could not be loaded.';
      }
    }

    console.log('text: ', markdownText);

    const lessonData = {
      title: row.title,
      description: row.subtopic_description,
      markdown_content: markdownText, // The actual text, not the path
      content_type: row.content_type,
      read_time: row.estimated_read_time,
    };

    res.json({ success: true, data: lessonData });
  } catch (err) {
    console.error('Error | getSubtopicContent:', err);
    res.status(500).json({ message: 'Error fetching content' });
  }
};
