import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Upload, Plus, Trash2, Loader2, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/services/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/* ======================
   Types
====================== */

interface RubricItem {
  id: number;
  criteria: string;
  description: string;
  maxScore: number;
}

/* ======================
   Component
====================== */

interface College {
  id: string;
  name: string;
}

export default function CreateAssignment() {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = (location.state as any) || {};

  const dashboardType = location.pathname.includes('/dashboard/admin') ? 'admin' : 'facilitator';
  const basePath = `/dashboard/${dashboardType}`;

  // ── Basic Information ──
  const [editId, ] = useState(editData.editId || null);
  const [title, setTitle] = useState(editData.title || '');
  const [description, setDescription] = useState(editData.description || '');
  const [course, setCourse] = useState(editData.course || '');
  const [college, setCollege] = useState(editData.collegeId || '');
  const [domain, setDomain] = useState(editData.domain || '');
  const [type, setType] = useState(editData.type || '');
  const [deadline, setDeadline] = useState(editData.deadline || '');

  // ── Colleges from API ──
  const [colleges, setColleges] = useState<College[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ── Instruction Document Upload ──
  const [instructionFile, setInstructionFile] = useState<File | null>(null);
  const [instructionUrl, setInstructionUrl] = useState(editData.instruction_file_url || '');
  const [instructionName, setInstructionName] = useState(editData.instruction_file_name || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    const allowed = ['.pdf', '.docx', '.txt', '.doc'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error('Only PDF, DOCX, and TXT files are supported');
      return;
    }

    setInstructionFile(file);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<{ success: boolean; url: string }>(
        '/college-assignments/upload-instruction',
        formData
      );
      setInstructionUrl(res.data.url);
      setInstructionName(file.name);
      toast.success('Instruction document uploaded!');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to upload document';
      toast.error(msg);
      setInstructionFile(null);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    apiClient
      .get<{ data: College[] }>('/colleges')
      .then((res) => setColleges(res.data.data))
      .catch(() => toast.error('Failed to load colleges'));
  }, []);

  // ── Evaluation Setup ──
  const [assignmentDescription, setAssignmentDescription] = useState(editData.assignmentDescription || '');
  const [aiEvaluationType, setAiEvaluationType] = useState(editData.aiEvaluationType || '');
  const [weightage, setWeightage] = useState(editData.weightage || '100');
  const [enablePlagiarism, setEnablePlagiarism] = useState(editData.enablePlagiarism || false);

  // ── Rubrics ──
  const [rubrics, setRubrics] = useState<RubricItem[]>(editData.rubricsList || []);

  // ── Submission Settings ──
  const [allowFileUpload, setAllowFileUpload] = useState(editData.allowFileUpload ?? true);
  const [allowGithubLink, setAllowGithubLink] = useState(editData.allowGithubLink ?? true);
  const [allowCodeEditor, setAllowCodeEditor] = useState(editData.allowCodeEditor ?? false);

  // ── Rubrics helpers ──
  const totalScore = rubrics.reduce((sum, r) => sum + r.maxScore, 0);

  const addRubric = () => {
    setRubrics((prev) => [
      ...prev,
      { id: Date.now(), criteria: '', description: '', maxScore: 10 },
    ]);
  };

  const removeRubric = (id: number) => {
    setRubrics((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRubric = (id: number, field: keyof RubricItem, value: string | number) => {
    setRubrics((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // ── Validation & Submit ──
  const handleCreate = async () => {
    const missing: string[] = [];

    if (!title.trim()) missing.push('Assignment Title');
    if (!course) missing.push('Course');
    if (!college) missing.push('College');
    if (!domain) missing.push('Domain');
    if (!type) missing.push('Type');
    if (!deadline) missing.push('Deadline');

    if (missing.length > 0) {
      toast.error(
        `Please fill in: ${missing.join(', ')}`,
        {
          duration: 4000,
          style: {
            maxWidth: 480,
          },
        },
      );
      return;
    }

    setSubmitting(true);
    try {
      let resId = editId;
      if (editId) {
        await apiClient.put(`/college-assignments/${editId}`, {
          title: title.trim(),
          description: description.trim() || null,
          due_date: deadline || null,
          course: course || null,
          instruction_file_url: instructionUrl || null,
          instruction_file_name: instructionName || null,
        });
        toast.success('Assignment updated successfully!');
      } else {
        const res = await apiClient.post('/college-assignments', {
          college_id: college,
          title: title.trim(),
          description: description.trim() || null,
          due_date: deadline || null,
          course: course || null,
          instruction_file_url: instructionUrl || null,
          instruction_file_name: instructionName || null,
        });
        resId = res.data.data.id;
        toast.success('Assignment created successfully!');
      }

      navigate(`${basePath}/assignment-success`, {
        state: {
          editId: resId,
          title,
          description,
          course,
          college: colleges.find((c) => c.id === college)?.name || college,
          collegeId: college,
          domain,
          type,
          deadline,
          assignmentDescription,
          aiEvaluationType,
          weightage,
          enablePlagiarism,
          allowFileUpload,
          allowGithubLink,
          allowCodeEditor,
          totalMarks: totalScore,
          rubricsList: rubrics,
          rubrics: rubrics.map((r) => ({
            name: r.criteria,
            score: r.maxScore,
          })),
        },
      });
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || 'Failed to create assignment';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ======================
     Render
  ====================== */

  return (
    <div className='min-h-screen bg-slate-50/60'>
      <div className='max-w-3xl mx-auto px-6 py-8 space-y-6 animate-in fade-in duration-500'>
        {/* ── Page Header ── */}
        <div className='flex items-center gap-3'>
          <button
            className='text-slate-500 hover:text-slate-700 transition'
            onClick={() => navigate(`${basePath}/assignments`)}
          >
            <ArrowLeft className='w-5 h-5' />
          </button>
          <div>
            <h1 className='text-xl font-bold text-slate-900'>Create Assignment</h1>
            <p className='text-sm text-slate-500'>Set up a new assignment for a branch</p>
          </div>
        </div>

        {/* ================================================================
            SECTION 1 — Basic Information
        ================================================================ */}
        <Card className='border-none shadow-sm'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base font-semibold text-slate-900'>Basic Information</CardTitle>
          </CardHeader>

          <CardContent className='space-y-4'>
            {/* Assignment Title */}
            <div className='space-y-1.5'>
              <Label className='text-sm text-slate-600'>Assignment Title</Label>
              <Input
                placeholder='e.g. React Hooks Unit Test 3'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className='space-y-1.5'>
              <Label className='text-sm text-slate-600'>Description</Label>
              <textarea
                className='w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
                placeholder='Describe the assignment objectives...'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Course & College */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label className='text-sm text-slate-600'>Course</Label>
                <Select value={course} onValueChange={setCourse}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Course' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='react'>React</SelectItem>
                    <SelectItem value='node'>Node.js</SelectItem>
                    <SelectItem value='python'>Python</SelectItem>
                    <SelectItem value='java'>Java</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-sm text-slate-600'>College</Label>
                <Select value={college} onValueChange={setCollege}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select College' />
                  </SelectTrigger>
                  <SelectContent>
                    {colleges.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Domain, Type, Deadline */}
            <div className='grid grid-cols-3 gap-4'>
              <div className='space-y-1.5'>
                <Label className='text-sm text-slate-600'>Domain</Label>
                <Select value={domain} onValueChange={setDomain}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='frontend'>Frontend</SelectItem>
                    <SelectItem value='backend'>Backend</SelectItem>
                    <SelectItem value='fullstack'>Full Stack</SelectItem>
                    <SelectItem value='mobile'>Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-sm text-slate-600'>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='individual'>Individual</SelectItem>
                    <SelectItem value='group'>Group</SelectItem>
                    <SelectItem value='lab'>Lab</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-sm text-slate-600'>Deadline</Label>
                <Input
                  type='date'
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            SECTION 2 — Evaluation Setup
        ================================================================ */}
        <Card className='border-none shadow-sm'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base font-semibold text-slate-900'>Evaluation Setup</CardTitle>
          </CardHeader>

          <CardContent className='space-y-4'>
            {/* Instruction Document */}
            <div className='space-y-1.5'>
              <Label className='text-sm text-slate-600'>Instruction Document</Label>
              <input
                ref={fileInputRef}
                type='file'
                accept='.pdf,.docx,.doc,.txt'
                className='hidden'
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />
              {instructionFile ? (
                <div className='flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4'>
                  <FileText className='w-8 h-8 text-blue-500 shrink-0' />
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-slate-700 truncate'>{instructionFile.name}</p>
                    <p className='text-xs text-slate-400'>
                      {uploading ? 'Uploading...' : 'Uploaded successfully'}
                    </p>
                  </div>
                  {uploading ? (
                    <Loader2 className='w-5 h-5 text-blue-500 animate-spin shrink-0' />
                  ) : (
                    <button
                      className='text-slate-400 hover:text-red-500 transition shrink-0'
                      onClick={() => {
                        setInstructionFile(null);
                        setInstructionUrl('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className='w-4 h-4' />
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className='border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer'
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                >
                  <Upload className='w-8 h-8 text-slate-300 mx-auto mb-2' />
                  <p className='text-sm text-slate-500'>Drag & drop instruction file or click to browse</p>
                  <p className='text-xs text-slate-400 mt-1'>Supports PDF, DOCX, TXT</p>
                </div>
              )}
            </div>

            {/* Assignment Description */}
            <div className='space-y-1.5'>
              <Label className='text-sm text-slate-600'>Assignment Description</Label>
              <textarea
                className='w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
                placeholder='Describe the assignment objectives, requirements, and expectations...'
                value={assignmentDescription}
                onChange={(e) => setAssignmentDescription(e.target.value)}
              />
            </div>

            {/* AI Evaluation Type & Weightage */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label className='text-sm text-slate-600'>AI Evaluation Type</Label>
                <Select value={aiEvaluationType} onValueChange={setAiEvaluationType}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='auto'>Auto</SelectItem>
                    <SelectItem value='manual'>Manual</SelectItem>
                    <SelectItem value='hybrid'>Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-sm text-slate-600'>Weightage (%)</Label>
                <Input
                  type='number'
                  placeholder='100'
                  value={weightage}
                  onChange={(e) => setWeightage(e.target.value)}
                />
              </div>
            </div>

            {/* Plagiarism Check Toggle */}
            <div className='flex items-center justify-between py-2'>
              <div>
                <p className='text-sm font-medium text-slate-900'>Enable Plagiarism Check</p>
                <p className='text-xs text-slate-500'>AI will cross-check submissions for similarity</p>
              </div>
              <Switch checked={enablePlagiarism} onCheckedChange={setEnablePlagiarism} />
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            SECTION 3 — Evaluation Rubrics
        ================================================================ */}
        <Card className='border-none shadow-sm'>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-base font-semibold text-slate-900'>Evaluation Rubrics</CardTitle>
              <div className='flex items-center gap-3'>
                <span className='text-sm text-slate-500'>
                  Total: <span className='font-semibold text-blue-600'>{totalScore}</span> Points
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-1 text-blue-600 border-blue-200 hover:bg-blue-50'
                  onClick={addRubric}
                >
                  <Plus className='w-3.5 h-3.5' /> Add Criteria
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className='space-y-3'>
            {rubrics.map((rubric) => (
              <div
                key={rubric.id}
                className='grid grid-cols-[1fr_2fr_80px_40px] gap-3 items-center'
              >
                <div className='space-y-1'>
                  <Label className='text-xs text-slate-400'>Criteria</Label>
                  <Input
                    value={rubric.criteria}
                    onChange={(e) => updateRubric(rubric.id, 'criteria', e.target.value)}
                    className='text-sm'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-slate-400'>Description</Label>
                  <Input
                    value={rubric.description}
                    onChange={(e) => updateRubric(rubric.id, 'description', e.target.value)}
                    className='text-sm'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-slate-400'>Max Score</Label>
                  <Input
                    type='number'
                    value={rubric.maxScore}
                    onChange={(e) => updateRubric(rubric.id, 'maxScore', Number(e.target.value))}
                    className='text-sm'
                  />
                </div>
                <div className='pt-5'>
                  <button
                    className='text-slate-400 hover:text-red-500 transition'
                    onClick={() => removeRubric(rubric.id)}
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ================================================================
            SECTION 4 — Submission Settings
        ================================================================ */}
        <Card className='border-none shadow-sm'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base font-semibold text-slate-900'>Submission Settings</CardTitle>
          </CardHeader>

          <CardContent className='space-y-1'>
            {/* Allow File Upload */}
            <div className='flex items-center justify-between py-3'>
              <div>
                <p className='text-sm font-medium text-slate-900'>Allow File Upload</p>
                <p className='text-xs text-slate-500'>Students can upload files</p>
              </div>
              <Switch checked={allowFileUpload} onCheckedChange={setAllowFileUpload} />
            </div>

            {/* Allow GitHub Link */}
            <div className='flex items-center justify-between py-3'>
              <div>
                <p className='text-sm font-medium text-slate-900'>Allow GitHub Link</p>
                <p className='text-xs text-slate-500'>Students can submit a GitHub repository URL</p>
              </div>
              <Switch checked={allowGithubLink} onCheckedChange={setAllowGithubLink} />
            </div>

            {/* Allow Code Editor Submission */}
            <div className='flex items-center justify-between py-3'>
              <div>
                <p className='text-sm font-medium text-slate-900'>Allow Code Editor Submission</p>
                <p className='text-xs text-slate-500'>Students can write code in the built-in editor</p>
              </div>
              <Switch checked={allowCodeEditor} onCheckedChange={setAllowCodeEditor} />
            </div>
          </CardContent>
        </Card>

        {/* ── Footer Actions ── */}
        <div className='flex justify-end gap-3 pb-8'>
          <Button
            variant='outline'
            className='px-6'
            onClick={() => navigate(`${basePath}/assignments`)}
          >
            Cancel
          </Button>
          <Button
            className='px-6 bg-blue-600 hover:bg-blue-700'
            onClick={handleCreate}
            disabled={submitting}
          >
            {submitting && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
            {submitting ? (editId ? 'Updating...' : 'Creating...') : (editId ? 'Update Assignment' : 'Create Assignment')}
          </Button>
        </div>
      </div>
    </div>
  );
}
