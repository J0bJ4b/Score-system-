import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { Student, Subject, ScoreItem, Score, Term } from '../types';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Award,
  AlertCircle,
  BarChart3,
  Percent,
  CheckCircle2,
} from 'lucide-react';

interface StudentProgressChartProps {
  student: Student;
  allStudents: Student[];
  subjects: Subject[];
  allScoreItems: ScoreItem[];
  allScores: Score[];
  terms: Term[];
  className?: string;
  showPrintableNotice?: boolean;
}

const SUBJECT_COLORS = [
  '#4f46e5', // indigo-600
  '#0284c7', // sky-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#7c3aed', // purple-600
  '#e11d48', // rose-600
  '#0d9488', // teal-600
  '#ea580c', // orange-600
];

export const StudentProgressChart: React.FC<StudentProgressChartProps> = ({
  student,
  allStudents,
  subjects,
  allScoreItems,
  allScores,
  terms,
  className = '',
  showPrintableNotice = false,
}) => {
  const [selectedViewMode, setSelectedViewMode] = useState<
    'single_subject' | 'multi_subjects' | 'term_comparison'
  >('single_subject');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [selectedTermId, setSelectedTermId] = useState<string>('all'); // 'all' or specific term
  const [scaleMode, setScaleMode] = useState<'percent' | 'raw'>('percent');

  const activeSubject =
    subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  // 1. Data for Single Subject Progression (Timeline of score items)
  const singleSubjectTimelineData = useMemo(() => {
    if (!activeSubject) return [];

    let targetItems = allScoreItems.filter(
      (i) => i.subject_id === activeSubject.id
    );

    if (selectedTermId !== 'all') {
      targetItems = targetItems.filter((i) => i.term_id === selectedTermId);
    }

    // Sort items by term then by original order
    const termMap: Record<string, number> = {};
    terms.forEach((t, idx) => {
      termMap[t.id] = idx;
    });

    targetItems.sort((a, b) => (termMap[a.term_id] || 0) - (termMap[b.term_id] || 0));

    return targetItems.map((item, index) => {
      const termObj = terms.find((t) => t.id === item.term_id);
      const termLabel = termObj?.name?.replace('ภาคเรียนที่ ', 'เทอม ') || '';

      // Student Score
      const studentScoreObj = allScores.find(
        (s) => s.student_id === student.id && s.score_item_id === item.id
      );
      const rawStudentScore =
        typeof studentScoreObj?.score === 'number'
          ? studentScoreObj.score
          : null;

      // Class Average for this item
      const classScores = allScores.filter(
        (s) =>
          s.score_item_id === item.id &&
          typeof s.score === 'number' &&
          !isNaN(s.score)
      );
      const classAvgRaw =
        classScores.length > 0
          ? classScores.reduce((acc, curr) => acc + (curr.score || 0), 0) /
            classScores.length
          : null;

      const maxScore = item.max_score || 10;

      // Scaled values (% of max)
      const studentPercent =
        rawStudentScore !== null
          ? Math.round((rawStudentScore / maxScore) * 1000) / 10
          : null;
      const classAvgPercent =
        classAvgRaw !== null
          ? Math.round((classAvgRaw / maxScore) * 1000) / 10
          : null;

      return {
        key: item.id,
        sequence: index + 1,
        shortName: `${item.name} (${termLabel})`,
        itemName: item.name,
        termName: termLabel,
        category: item.category || 'regular',
        maxScore,
        studentScore:
          scaleMode === 'percent' ? studentPercent : rawStudentScore,
        rawStudentScore,
        classAvgScore:
          scaleMode === 'percent'
            ? classAvgPercent
            : classAvgRaw !== null
            ? Math.round(classAvgRaw * 10) / 10
            : null,
        passingThreshold: scaleMode === 'percent' ? 50 : maxScore * 0.5,
        status: studentScoreObj?.status || 'normal',
      };
    });
  }, [
    activeSubject,
    allScoreItems,
    selectedTermId,
    terms,
    allScores,
    student.id,
    scaleMode,
  ]);

  // 2. Data for Multi-Subject Progression across Terms
  const multiSubjectProgressionData = useMemo(() => {
    // Generate unified steps: e.g. เทอม 1 คะแนนเก็บ -> เทอม 1 กลางภาค -> เทอม 1 ปลายภาค -> เทอม 2 คะแนนเก็บ...
    const assessmentMilestones = [
      { id: 't1_regular', label: 'เทอม 1: คะแนนเก็บ', termId: 'term-1', category: 'regular' },
      { id: 't1_mid', label: 'เทอม 1: กลางภาค', termId: 'term-1', category: 'midterm' },
      { id: 't1_fin', label: 'เทอม 1: ปลายภาค', termId: 'term-1', category: 'final' },
      { id: 't2_regular', label: 'เทอม 2: คะแนนเก็บ', termId: 'term-2', category: 'regular' },
      { id: 't2_mid', label: 'เทอม 2: กลางภาค', termId: 'term-2', category: 'midterm' },
      { id: 't2_fin', label: 'เทอม 2: ปลายภาค', termId: 'term-2', category: 'final' },
    ];

    return assessmentMilestones.map((milestone) => {
      const row: Record<string, any> = {
        milestone: milestone.label,
        milestoneId: milestone.id,
      };

      subjects.forEach((sub) => {
        const subItems = allScoreItems.filter(
          (i) =>
            i.subject_id === sub.id &&
            i.term_id === milestone.termId &&
            i.category === milestone.category
        );

        if (subItems.length > 0) {
          const itemIds = new Set(subItems.map((i) => i.id));
          const maxTotal = subItems.reduce(
            (acc, curr) => acc + (curr.max_score || 0),
            0
          );
          const studentScores = allScores.filter(
            (s) =>
              s.student_id === student.id &&
              itemIds.has(s.score_item_id) &&
              typeof s.score === 'number'
          );
          const studentTotal = studentScores.reduce(
            (acc, curr) => acc + (curr.score || 0),
            0
          );

          if (maxTotal > 0 && studentScores.length > 0) {
            const pct = Math.round((studentTotal / maxTotal) * 1000) / 10;
            row[sub.id] = pct;
            row[`${sub.id}_raw`] = `${studentTotal}/${maxTotal}`;
          } else {
            row[sub.id] = null;
          }
        } else {
          row[sub.id] = null;
        }
      });

      return row;
    });
  }, [subjects, allScoreItems, allScores, student.id]);

  // 3. Term-over-Term Growth Analysis
  const termGrowthAnalysis = useMemo(() => {
    return subjects.map((sub) => {
      const t1Items = allScoreItems.filter(
        (i) => i.subject_id === sub.id && i.term_id === 'term-1'
      );
      const t2Items = allScoreItems.filter(
        (i) => i.subject_id === sub.id && i.term_id === 'term-2'
      );

      const t1Ids = new Set(t1Items.map((i) => i.id));
      const t2Ids = new Set(t2Items.map((i) => i.id));

      const t1Scores = allScores.filter(
        (s) =>
          s.student_id === student.id &&
          t1Ids.has(s.score_item_id) &&
          typeof s.score === 'number'
      );
      const t2Scores = allScores.filter(
        (s) =>
          s.student_id === student.id &&
          t2Ids.has(s.score_item_id) &&
          typeof s.score === 'number'
      );

      const t1Total = t1Scores.reduce((acc, curr) => acc + (curr.score || 0), 0);
      const t2Total = t2Scores.reduce((acc, curr) => acc + (curr.score || 0), 0);

      const diff = t2Total - t1Total;
      const growthPercent =
        t1Total > 0 ? Math.round(((t2Total - t1Total) / t1Total) * 1000) / 10 : 0;

      return {
        subject: sub,
        t1Total,
        t2Total,
        diff,
        growthPercent,
        trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
      };
    });
  }, [subjects, allScoreItems, allScores, student.id]);

  // Insights
  const overallInsights = useMemo(() => {
    const validRows = singleSubjectTimelineData.filter(
      (d) => d.studentScore !== null
    );
    if (validRows.length < 2) {
      return {
        trendText: 'มีข้อมูลประเมินต่อเนื่องเพื่อวิเคราะห์แนวโน้มพัฒนาการ',
        isImproving: true,
        diffFirstLast: 0,
        highestItem: null,
      };
    }

    const first = validRows[0].studentScore || 0;
    const last = validRows[validRows.length - 1].studentScore || 0;
    const diff = Math.round((last - first) * 10) / 10;

    let highest = validRows[0];
    validRows.forEach((r) => {
      if ((r.studentScore || 0) > (highest.studentScore || 0)) {
        highest = r;
      }
    });

    return {
      trendText:
        diff > 0
          ? `มีพัฒนาการเพิ่มขึ้น +${diff}% จากช่วงแรก`
          : diff < 0
          ? `คะแนนช่วงท้ายลดลง ${diff}% ควรติดตามเพิ่มเติม`
          : 'ผลการเรียนมีความสม่ำเสมอและคงที่ตลอดภาคเรียน',
      isImproving: diff >= 0,
      diffFirstLast: diff,
      highestItem: highest,
    };
  }, [singleSubjectTimelineData]);

  return (
    <div
      className={`bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-5 ${className}`}
    >
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>กราฟวิเคราะห์พัฒนาการรายบุคคล (Learning Progress)</span>
              <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                Recharts
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ติดตามเส้นทางการเรียนรู้ของ {student.name} ตลอดแต่ละช่วงการประเมิน
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSelectedViewMode('single_subject')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              selectedViewMode === 'single_subject'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            เจาะลึกรายวิชา
          </button>
          <button
            type="button"
            onClick={() => setSelectedViewMode('multi_subjects')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              selectedViewMode === 'multi_subjects'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            เปรียบเทียบทุกวิชา
          </button>
          <button
            type="button"
            onClick={() => setSelectedViewMode('term_comparison')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              selectedViewMode === 'term_comparison'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            เทอม 1 vs เทอม 2
          </button>
        </div>
      </div>

      {/* Mode 1: Single Subject Detailed Progress */}
      {selectedViewMode === 'single_subject' && (
        <div className="space-y-4">
          {/* Sub-filters (Subject Selector, Term Filter, Scale Mode) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">วิชา:</span>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">เทอม:</span>
                <select
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">ทุกภาคเรียน (เทอม 1 และ 2)</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scale toggle */}
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setScaleMode('percent')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  scaleMode === 'percent'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ร้อยละ (%)
              </button>
              <button
                type="button"
                onClick={() => setScaleMode('raw')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  scaleMode === 'raw'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                คะแนนดิบ
              </button>
            </div>
          </div>

          {/* Recharts Line Chart */}
          <div className="h-[280px] sm:h-[320px] w-full pt-2">
            {singleSubjectTimelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={singleSubjectTimelineData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    angle={-15}
                    textAnchor="end"
                    interval={0}
                    height={45}
                  />
                  <YAxis
                    domain={scaleMode === 'percent' ? [0, 100] : [0, 'auto']}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    unit={scaleMode === 'percent' ? '%' : ''}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5">
                            <div className="font-bold text-sm text-indigo-200 border-b border-slate-700 pb-1">
                              {data.itemName} ({data.termName})
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-300">
                                👦 คะแนนของนักเรียน:
                              </span>
                              <span className="font-bold text-emerald-400 text-sm">
                                {data.rawStudentScore !== null
                                  ? `${data.rawStudentScore} / ${data.maxScore} (${data.studentScore}%)`
                                  : 'ยังไม่มีคะแนน'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-300">
                                👥 ค่าเฉลี่ยทั้งห้อง:
                              </span>
                              <span className="font-bold text-sky-300">
                                {data.classAvgScore !== null
                                  ? `${data.classAvgScore}${scaleMode === 'percent' ? '%' : ''}`
                                  : '-'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 pt-1">
                              ประเภท: {data.category === 'regular' ? 'คะแนนเก็บ' : data.category === 'midterm' ? 'กลางภาค' : 'ปลายภาค'}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                  />

                  {/* Reference line for 50% passing score in percent mode */}
                  {scaleMode === 'percent' && (
                    <ReferenceLine
                      y={50}
                      stroke="#f43f5e"
                      strokeDasharray="4 4"
                      label={{
                        value: 'เกณฑ์ผ่าน 50%',
                        fill: '#e11d48',
                        fontSize: 10,
                        position: 'insideBottomRight',
                      }}
                    />
                  )}

                  {/* Class average line */}
                  <Line
                    type="monotone"
                    dataKey="classAvgScore"
                    name="ค่าเฉลี่ยของเพื่อนในห้อง"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#94a3b8' }}
                  />

                  {/* Student performance line */}
                  <Line
                    type="monotone"
                    dataKey="studentScore"
                    name={`คะแนนของ ${student.name}`}
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 7, fill: '#4338ca' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                ยังไม่มีรายการคะแนนในวิชานี้
              </div>
            )}
          </div>

          {/* Quick Progress Highlights Banner */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                  overallInsights.isImproving ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              >
                {overallInsights.isImproving ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="text-slate-500 font-medium">แนวโน้มพัฒนาการ</div>
                <div className="font-bold text-slate-900">
                  {overallInsights.trendText}
                </div>
              </div>
            </div>

            {overallInsights.highestItem && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-500 font-medium">ช่วงที่ทำได้สูงสุด</div>
                  <div className="font-bold text-slate-900">
                    {overallInsights.highestItem.itemName} (
                    {overallInsights.highestItem.studentScore}%)
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-slate-500 font-medium">คำแนะนำการเรียน</div>
                <div className="font-bold text-slate-900">
                  {overallInsights.isImproving
                    ? 'รักษาจังหวะการเรียนรู้ต่อเนื่อง'
                    : 'ทบทวนเนื้อหาก่อนสอบปลายภาค'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Multi-Subjects Comparison */}
      {selectedViewMode === 'multi_subjects' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>เปรียบเทียบร้อยละคะแนน (%) ของทุกวิชาตามลำดับช่วงการประเมิน</span>
            <span className="font-bold text-indigo-700">
              วิชาทั้งหมด {subjects.length} วิชา
            </span>
          </div>

          <div className="h-[300px] sm:h-[340px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={multiSubjectProgressionData}
                margin={{ top: 10, right: 20, left: -10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="milestone"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  interval={0}
                  angle={-10}
                  textAnchor="end"
                  height={40}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  unit="%"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 max-w-xs">
                          <div className="font-bold text-indigo-200 border-b border-slate-700 pb-1">
                            📌 {label}
                          </div>
                          <div className="space-y-1">
                            {payload.map((entry: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-slate-300">
                                    {entry.name}:
                                  </span>
                                </div>
                                <span className="font-bold font-mono">
                                  {entry.value !== null
                                    ? `${entry.value}%`
                                    : '-'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="center"
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                />

                <ReferenceLine
                  y={50}
                  stroke="#cbd5e1"
                  strokeDasharray="3 3"
                />

                {subjects.map((sub, idx) => (
                  <Line
                    key={sub.id}
                    type="monotone"
                    dataKey={sub.id}
                    name={sub.name}
                    stroke={SUBJECT_COLORS[idx % SUBJECT_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Mode 3: Term-over-Term Growth Comparison */}
      {selectedViewMode === 'term_comparison' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-500">
            วิเคราะห์การเปลี่ยนแปลงคะแนนรวมระหว่าง <strong>ภาคเรียนที่ 1</strong> และ{' '}
            <strong>ภาคเรียนที่ 2</strong> (คะแนนเต็มแต่ละเทอม 50 คะแนน)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {termGrowthAnalysis.map((item) => (
              <div
                key={item.subject.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">
                    {item.subject.name}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      item.diff > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.diff < 0
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.diff > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : item.diff < 0 ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : null}
                    <span>
                      {item.diff > 0 ? `+${item.diff}` : `${item.diff}`} คะแนน
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">
                      เทอม 1
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {item.t1Total} / 50
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">
                      เทอม 2
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {item.t2Total} / 50
                    </span>
                  </div>
                </div>

                {/* Progress bar comparison */}
                <div className="space-y-1">
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, (item.t2Total / 50) * 100)}%` }}
                      className={`h-full rounded-full ${
                        item.diff >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 flex justify-between">
                    <span>ความก้าวหน้า</span>
                    <span className="font-bold">
                      {item.growthPercent > 0
                        ? `+${item.growthPercent}%`
                        : `${item.growthPercent}%`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
