import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, Users, TrendingUp } from 'lucide-react';

interface ZipChartViewProps {
  zipCode: string;
  zipData: any;
}

const ZipChartView: React.FC<ZipChartViewProps> = ({ zipCode, zipData }) => {
  // Calculate percentages for gender distribution
  const femalePercentage = zipData.totalStudents > 0 ? (zipData.totalFemale / zipData.totalStudents) * 100 : 0;
  const malePercentage = zipData.totalStudents > 0 ? (zipData.totalMale / zipData.totalStudents) * 100 : 0;

  // Grade level data
  const gradeData = [
    { name: 'Pre-K', value: zipData.processedTotals?.get('Pre_K') || 0, color: '#3b82f6' },
    { name: 'KG', value: zipData.processedTotals?.get('KG') || 0, color: '#10b981' },
    { name: 'Grade 1', value: zipData.processedTotals?.get('Grade_1') || 0, color: '#f59e0b' },
    { name: 'Grade 2', value: zipData.processedTotals?.get('Grade_2') || 0, color: '#ef4444' },
    { name: 'Grade 3', value: zipData.processedTotals?.get('Grade_3') || 0, color: '#8b5cf6' },
    { name: 'Grade 4', value: zipData.processedTotals?.get('Grade_4') || 0, color: '#06b6d4' },
    { name: 'Grade 5', value: zipData.processedTotals?.get('Grade_5') || 0, color: '#84cc16' },
  ];

  const maxGradeValue = Math.max(...gradeData.map(g => g.value));
  const chartHeight = 300;
  const barWidth = 70;
  const barSpacing = 25;
  const leftMargin = 80;
  const rightMargin = 40;
  const chartWidth = leftMargin + rightMargin + (gradeData.length * (barWidth + barSpacing)) - barSpacing;

  return (
    <div className="space-y-6">
      {/* Grade Level Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Grade Level Distribution - ZIP {zipCode}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <svg width={chartWidth} height={chartHeight + 80} className="mx-auto">
              {/* Chart background */}
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="100%" stopColor="#f1f5f9" />
                </linearGradient>
              </defs>
              <rect width={chartWidth} height={chartHeight} fill="url(#chartGradient)" rx="8" />
              
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <g key={i}>
                  <line
                    x1={leftMargin - 20}
                    y1={50 + (i * (chartHeight - 100) / 4)}
                    x2={chartWidth - rightMargin}
                    y2={50 + (i * (chartHeight - 100) / 4)}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={leftMargin - 30}
                    y={55 + (i * (chartHeight - 100) / 4)}
                    textAnchor="end"
                    className="text-xs fill-gray-500"
                  >
                    {Math.round(maxGradeValue - (i * maxGradeValue / 4))}
                  </text>
                </g>
              ))}
              
              {/* Bars */}
              {gradeData.map((grade, index) => {
                const x = leftMargin + index * (barWidth + barSpacing);
                const barHeight = maxGradeValue > 0 ? ((grade.value / maxGradeValue) * (chartHeight - 100)) : 0;
                const y = chartHeight - 50 - barHeight;
                
                return (
                  <g key={grade.name}>
                    {/* Bar with gradient */}
                    <defs>
                      <linearGradient id={`barGradient${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={grade.color} stopOpacity="0.8" />
                        <stop offset="100%" stopColor={grade.color} stopOpacity="0.6" />
                      </linearGradient>
                    </defs>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={`url(#barGradient${index})`}
                      rx="4"
                      className="transition-all duration-500 hover:opacity-80"
                    />
                    
                    {/* Value label on top of bar */}
                    <text
                      x={x + barWidth / 2}
                      y={y - 8}
                      textAnchor="middle"
                      className="text-sm font-semibold fill-gray-700"
                    >
                      {grade.value}
                    </text>
                    
                    {/* Grade label */}
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight - 25}
                      textAnchor="middle"
                      className="text-sm font-medium fill-gray-600"
                    >
                      {grade.name}
                    </text>
                  </g>
                );
              })}
              
              {/* Chart title */}
              <text
                x={chartWidth / 2}
                y={chartHeight + 50}
                textAnchor="middle"
                className="text-sm font-medium fill-gray-600"
              >
                Number of Students by Grade Level
              </text>
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Gender Distribution Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gender Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <svg width="400" height="200" className="mx-auto">
              {/* Background */}
              <rect width="400" height="200" fill="#f8fafc" rx="8" />
              
              {/* Female area */}
              <path
                d={`M 50 150 Q 200 ${150 - (femalePercentage * 0.8)} 350 150 L 350 150 Z`}
                fill="#be185d"
                fillOpacity="0.6"
                className="transition-all duration-500"
              />
              
              {/* Male area */}
              <path
                d={`M 50 150 Q 200 ${150 - (malePercentage * 0.8)} 350 150 L 350 180 L 50 180 Z`}
                fill="#ea580c"
                fillOpacity="0.6"
                className="transition-all duration-500"
              />
              
              {/* Labels */}
              <text x="200" y="30" textAnchor="middle" className="text-lg font-bold fill-gray-800">
                {zipData.totalStudents} Total Students
              </text>
              
              {/* Legend */}
              <g>
                <rect x="80" y="60" width="12" height="12" fill="#be185d" rx="2" />
                <text x="100" y="70" className="text-sm fill-gray-700">
                  Female: {zipData.totalFemale} ({femalePercentage.toFixed(1)}%)
                </text>
                
                <rect x="80" y="80" width="12" height="12" fill="#ea580c" rx="2" />
                <text x="100" y="90" className="text-sm fill-gray-700">
                  Male: {zipData.totalMale} ({malePercentage.toFixed(1)}%)
                </text>
              </g>
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* School Statistics with Mini Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              School Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {zipData.processedTotals?.get('Schl_Cn') || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Schools</div>
                </div>
                <div className="w-16 h-16">
                  <svg width="64" height="64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                    <circle 
                      cx="32" 
                      cy="32" 
                      r="28" 
                      fill="none" 
                      stroke="#3b82f6" 
                      strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 28 * 0.75} ${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * 0.25}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {zipData.totalStudents > 0 && zipData.processedTotals?.get('Schl_Cn') > 0 
                      ? Math.round(zipData.totalStudents / zipData.processedTotals.get('Schl_Cn'))
                      : 0}
                  </div>
                  <div className="text-sm text-gray-600">Avg Students/School</div>
                </div>
                <div className="w-16 h-16">
                  <svg width="64" height="64">
                    <rect x="8" y="48" width="8" height="8" fill="#10b981" rx="1" />
                    <rect x="20" y="40" width="8" height="16" fill="#10b981" rx="1" />
                    <rect x="32" y="32" width="8" height="24" fill="#10b981" rx="1" />
                    <rect x="44" y="24" width="8" height="32" fill="#10b981" rx="1" />
                  </svg>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Data Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {zipData.count}
                  </div>
                  <div className="text-sm text-gray-600">Data Records</div>
                </div>
                <div className="w-16 h-16">
                  <svg width="64" height="64">
                    <path
                      d="M 8 48 Q 24 32 40 40 T 56 24"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx="8" cy="48" r="3" fill="#8b5cf6" />
                    <circle cx="24" cy="36" r="3" fill="#8b5cf6" />
                    <circle cx="40" cy="40" r="3" fill="#8b5cf6" />
                    <circle cx="56" cy="24" r="3" fill="#8b5cf6" />
                  </svg>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {zipData.processedTotals?.get('Stdnt_R') || 0}
                  </div>
                  <div className="text-sm text-gray-600">Student Ratio</div>
                </div>
                <div className="w-16 h-16">
                  <svg width="64" height="64">
                    <circle cx="32" cy="32" r="24" fill="none" stroke="#fed7aa" strokeWidth="8" />
                    <circle cx="32" cy="32" r="24" fill="none" stroke="#ea580c" strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 24 * 0.6} ${2 * Math.PI * 24}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ZipChartView;