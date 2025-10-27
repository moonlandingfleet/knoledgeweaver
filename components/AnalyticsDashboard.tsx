import React, { useState, useEffect } from 'react';
import { Persona, Source } from '../types';
import { AnalyticsService, UsageStats, PerformanceMetrics } from '../services/analyticsService';
import {KnowledgeProcessingService } from '../services/knowledgeProcessingService';
import { FeedbackService } from '../services/feedbackService';
import CloseIcon from './icons/CloseIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import UserCircleIcon from './icons/UserCircleIcon';

interface AnalyticsDashboardProps {
  personas: Persona[];
  knowledgeSources: Source[];
  generatedContent: string;
  onClose: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  personas,
  knowledgeSources,
  generatedContent,
  onClose
}) => {
  const [stats,setStats] = useState<UsageStats | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const[knowledgeStats, setKnowledgeStats] = useState<any>(null);
  const [feedbackStats, setFeedbackStats] = useState<any>(null);
  const[activeTab, setActiveTab] = useState<'overview' | 'performance' | 'consistency' | 'knowledge'>('overview');
  const analyticsService =AnalyticsService.getInstance();
  const knowledgeProcessingService = KnowledgeProcessingService.getInstance();
  const feedbackService = FeedbackService.getInstance();

useEffect(() => {
    const updateStats = () => {
      const currentStats = analyticsService.getUsageStats(personas, knowledgeSources, generatedContent);
      const currentMetrics = analyticsService.getPerformanceMetrics();
      setStats(currentStats);
      setMetrics(currentMetrics);
      
// Get knowledge quality stats
      const knowledgeQualityStats = knowledgeProcessingService.getKnowledgeQualityStats();
      setKnowledgeStats(knowledgeQualityStats);
      
      // Get feedback stats
      const feedbackHistory = feedbackService.getFeedbackHistory();
      const totalFeedbacks = feedbackHistory.length;
      const refinementFeedbacks = feedbackHistory.filter(f => f.type === 'refinement').length;
      const qualityCheckFeedbacks = feedbackHistory.filter(f => f.type === 'quality_check').length;
      const manualRatings = feedbackHistory.filter(f => f.type === 'manual_rating').length;
      
      setFeedbackStats({
        totalFeedbacks,
refinementFeedbacks,
        qualityCheckFeedbacks,
        manualRatings
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [personas, knowledgeSources, generatedContent, analyticsService,knowledgeProcessingService, feedbackService]);

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' '+ newDate(dateString).toLocaleTimeString();
  };

  const formatNumber = (num:number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getTrendIcon= (trend: string) => {
    switch (trend) {
      case 'improving': return'📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
   switch (trend) {
      case 'improving': return 'text-green-400';
      case'declining': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  if (!stats || !metrics) {
    return(
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flexitems-center justify-center z-50 p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-t-transparent border-indigo-400 rounded-full animate-spin mx-auto mb-2"></div>
            <p>Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
<div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BookOpenIcon className="w-5 h-5" />
           Performance Analytics
          </h2>
<div className="flex items-center gap-2">
<button onClick={() => {
                const data = analyticsService.exportPerformanceData();
                const blob = new Blob([data],{ type: 'application/json' });
                const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
                a.download = `performance-analytics-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
             }}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              Export Data</button>
<button
              onClick={() => analyticsService.clearAnalytics()}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
             Clear Data
            </button>
            <button
              onClick={onClose}
             className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100"
              aria-label="Close"
           >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

{/* Tab Navigation */}
        <div className="flex border-b border-slate-700 px-4">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'performance', label: 'Performance', icon: '⚡' },
            {id: 'consistency', label: 'Consistency', icon: '🎯' },
            { id: 'knowledge', label: 'Knowledge Quality', icon: '📚' }
          ].map(tab => (
            <button
             key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
             className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-slate-400 hover:text-slate-300'
            }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

<main className="flex-grow overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Key Metrics Cards */}
               <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">QualityScore</h3>
                  <div className="text-2xl font-bold text-indigo-400">{metrics.averageQualityScore.toFixed(0)}/100</div>
                  <div className={`text-xs ${getTrendColor(metrics.qualityTrend)} flex items-center gap-1`}>
                   {getTrendIcon(metrics.qualityTrend)} {metrics.qualityTrend}
                  </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">Consistency</h3>
                  <div className="text-2xl font-bold text-green-400">{metrics.consistencyScore.toFixed(0)}/100</div>
                  <div className="text-xs text-slate-400">Persona stability</div>
                </div>

               <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">ResponseTime</h3>
                  <div className="text-2xl font-bold text-yellow-400">{metrics.averageResponseTime.toFixed(1)}s</div>
                  <div className="text-xs text-slate-400">Average generation</div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">WeeklyGrowth</h3>
                  <div className={`text-2xl font-bold ${metrics.weeklyImprovement >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {metrics.weeklyImprovement > 0 ? '+' : ''}{metrics.weeklyImprovement.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-400">Quality points</div>
</div>
              </div>

              {/* Progress Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-md font-semiboldtext-slate-200 mb-3">Knowledge Integration</h3>
                  <div className="space-y-3">
                    <div>
                     <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Utilization Rate</span>
                       <span className="text-slate-300">{metrics.knowledgeUtilizationRate.toFixed(0)}%</span>
</div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all"
                          style={{ width: `${metrics.knowledgeUtilizationRate}%` }}
                        ></div>
</div>
                    </div>
                   <div>
<div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Source Diversity</span>
                        <span className="text-slate-300">{metrics.sourceDiversityScore.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${metrics.sourceDiversityScore}%` }}
                        ></div>
</div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-md font-semibold text-slate-200 mb-3">User Engagement</h3>
<div className="space-y-3">
                  <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Refinement Rate</span>
                        <span className="text-slate-300">{metrics.refinementRate.toFixed(0)}%</span>
                      </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full transition-all"
                          style={{ width: `${metrics.refinementRate}%` }}
                       ></div>
                      </div>
                    </div>
<div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Follow-up Rate</span>
                        <span className="text-slate-300">{metrics.questionSuccessRate.toFixed(0)}%</span>
                      </div>
<div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${metrics.questionSuccessRate}%` }}
                       ></div>
</div>
                    </div>
                  </div>
</div>
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && knowledgeStats && feedbackStats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">Avg. Knowledge Quality</h3>
                  <div className="text-2xl font-bold text-indigo-400">
{knowledgeStats.avgQuality.toFixed(0)}/100
                  </div>
                  <div className="text-xs text-slate-400">Based on {knowledgeStats.totalSources} sources</div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">HighQuality Sources</h3>
                  <div className="text-2xl font-bold text-green-400">
                    {knowledgeStats.highQualityCount}
                  </div>
                  <div className="text-xs text-slate-400">
                    {knowledgeStats.totalSources > 0 
                      ? `${Math.round((knowledgeStats.highQualityCount / knowledgeStats.totalSources) * 100)}% of total`
                      : '0% of total'}
                  </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">TotalFeedback</h3>
                  <div className="text-2xl font-bold text-yellow-400">
                    {feedbackStats.totalFeedbacks}
                  </div>
                  <div className="text-xs text-slate-400">Across all documents</div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">Manual Ratings</h3>
                  <div className="text-2xl font-bold text-purple-400">
                    {feedbackStats.manualRatings}
                  </div>
                  <div className="text-xs text-slate-400">
                    {feedbackStats.totalFeedbacks > 0 
                      ? `${Math.round((feedbackStats.manualRatings / feedbackStats.totalFeedbacks) * 100)}% of feedback`
                      : '0% of feedback'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-md font-semibold text-slate-200 mb-3">Knowledge Quality Distribution</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">High Quality (80-100)</span>
                        <span className="text-slate-300">
                          {knowledgeStats.qualityDistribution.high || 0} sources
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ 
width: `${knowledgeStats.totalSources > 0 
                              ? ((knowledgeStats.qualityDistribution.high || 0) / knowledgeStats.totalSources) * 100 
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Medium Quality (50-79)</span>
                        <span className="text-slate-300">
                          {knowledgeStats.qualityDistribution.medium || 0} sources
                        </span>
                     </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full transition-all"
                          style={{ 
                            width: `${knowledgeStats.totalSources > 0 
                              ? ((knowledgeStats.qualityDistribution.medium|| 0) / knowledgeStats.totalSources) * 100 
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Low Quality (0-49)</span>
                        <span className="text-slate-300">
                          {knowledgeStats.qualityDistribution.low || 0} sources
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all"
                          style={{ 
                            width: `${knowledgeStats.totalSources > 0 
                              ? ((knowledgeStats.qualityDistribution.low || 0) / knowledgeStats.totalSources) * 100 
                              : 0}%` 
                          }}
                        ></div>
</div>
                    </div>
                 </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-md font-semibold text-slate-200 mb-3">Feedback Distribution</h3>
                  <div className="space-y-3">
<div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Manual Ratings</span>
                        <span className="text-slate-300">
                          {feedbackStats.manualRatings}
                        </span>
                      </div>
<div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all"
                          style={{ 
                            width: `${feedbackStats.totalFeedbacks > 0 
                              ? (feedbackStats.manualRatings / feedbackStats.totalFeedbacks) * 100 
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Refinement Feedback</span>
                        <span className="text-slate-300">
                          {feedbackStats.refinementFeedbacks}
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ 
                            width: `${feedbackStats.totalFeedbacks > 0 
                              ? (feedbackStats.refinementFeedbacks / feedbackStats.totalFeedbacks) * 100 
                              : 0}%` 
                          }}
                        ></div>
                      </div>
</div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">QualityChecks</span>
                        <span className="text-slate-300">
                          {feedbackStats.qualityCheckFeedbacks}
                        </span>
                     </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all"
                          style={{ 
width: `${feedbackStats.totalFeedbacks > 0 
                              ? (feedbackStats.qualityCheckFeedbacks / feedbackStats.totalFeedbacks) * 100 
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
             </div>

              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="text-md font-semibold text-slate-200 mb-3">Knowledge Quality Insights</h3>
                <ul className="text-slate-300 text-sm space-y-2">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>
                      {knowledgeStats.highQualityCount > knowledgeStats.totalSources * 0.7 
                        ? 'Most of your knowledge sources arehigh quality. Keep up the good work!' 
                        : 'Consider improving the qualityof your knowledge sources for better results.'}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>
                      {feedbackStats.manualRatings > feedbackStats.totalFeedbacks * 0.3
                        ? 'You are actively rating documents, which helps improve the system.'
                        : 'Rate more documents manually to help the system learn your preferences.'}
                    </span>
                  </li>
                  <li className="flex items-start">
                   <span className="text-green-400 mr-2">✓</span>
                    <span>
                      {knowledgeStats.totalSources > 5
                        ? 'You have a good variety of knowledge sources.'
                        : 'Add more diverse knowledge sources to improve document synthesis.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
)}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-mdfont-semibold text-slate-200mb-3">PersonaConsistency</h3>
                  <div className="text-2xl font-bold text-indigo-400">{metrics.personaConsistencyScore.toFixed(0)}/100</div>
                  <div className="text-xs text-slate-400">Character stabilityover time</div>
               </div>

                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-md font-semibold text-slate-200 mb-3">Response Quality</h3>
                  <div className="text-2xl font-bold text-green-400">{metrics.averageQualityScore.toFixed(0)}/100</div>
                  <div className={`text-xs ${getTrendColor(metrics.qualityTrend)}`}>
                    {getTrendIcon(metrics.qualityTrend)} {metrics.qualityTrend}
                  </div>
</div>

                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-md font-semibold text-slate-200 mb-3">Knowledge Growth</h3>
<div className="text-2xl font-bold text-blue-400">{metrics.knowledgeGrowth.toFixed(0)}%</div>
                  <div className="text-xs text-slate-400">Weekly expansion</div>
                </div>
              </div>

<div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="text-md font-semibold text-slate-200 mb-3">Performance Trends</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Response Length Trend:</span>
<span className={metrics.responseLengthTrend > 0 ? 'text-green-400': metrics.responseLengthTrend <0 ? 'text-red-400' : 'text-yellow-400'}>
                        {metrics.responseLengthTrend > 0 ? 'Increasing' : metrics.responseLengthTrend < 0 ? 'Decreasing' : 'Stable'}
                      </span>
                  </div>
<div className="flex justify-between">
                      <span className="text-slate-400">Persona Evolution:</span>
                      <span className="text-blue-400">{metrics.personaEvolution.toFixed(0)}% growth</span>
                    </div>
                  </div>
                  <div className="space-y-2">
<div className="flex justify-between">
                      <span className="text-slate-400">Avg Response Time:</span>
                      <span className="text-yellow-400">{metrics.averageResponseTime.toFixed(1)}s</span>
                    </div>
                    <div className="flex justify-between">
<span className="text-slate-400">Weekly Improvement:</span>
                      <span className={metrics.weeklyImprovement >= 0 ? 'text-green-400' : 'text-red-400'}>
{metrics.weeklyImprovement > 0? '+' :''}{metrics.weeklyImprovement.toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'consistency' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-md font-semibold text-slate-200 mb-3">Quality Assessment Breakdown</h3>
<div className="space-y-3">
                    {[
                      { label: 'Persona Consistency', value: metrics.personaConsistencyScore, color: 'indigo' },
                      { label: 'Response Relevance', value: metrics.averageQualityScore * 0.9, color: 'green' },
{ label:'Knowledge Integration', value: metrics.knowledgeUtilizationRate, color: 'blue' }
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">{item.label}</span>
<span className={`text-${item.color}-400`}>{item.value.toFixed(0)}/100</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className={`bg-${item.color}-500 h-2 rounded-full transition-all`}
                            style={{ width: `${item.value}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg">
<h3 className="text-md font-semibold text-slate-200 mb-3">Consistency Analysis</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Overall Consistency:</span>
                      <span className="text-indigo-400">{metrics.consistencyScore.toFixed(0)}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Quality Trend:</span>
                    <span className={getTrendColor(metrics.qualityTrend)}>
                        {getTrendIcon(metrics.qualityTrend)}{metrics.qualityTrend}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Refinement Rate:</span>
<span className={metrics.refinementRate < 20 ? 'text-green-400' : metrics.refinementRate < 50 ? 'text-yellow-400' : 'text-red-400'}>
                        {metrics.refinementRate.toFixed(0)}%
                      </span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-slate-400">Success Rate:</span>
                      <span className="text-purple-400">{metrics.questionSuccessRate.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
</div>

             <div className="bg-slate-900/50 p-4 rounded-lg">
               <h3 className="text-md font-semibold text-slate-200 mb-3">Recommendations</h3>
                <div className="space-y-2 text-sm">
                 {metrics.consistencyScore<70 && (
                    <div className="flex items-start gap-2 text-yellow-400">
                      <span>⚠️</span>
                      <span>Persona consistency is low.Consider refining persona definitions or adding more shaper documents.</span>
                    </div>
                 )}
                 {metrics.qualityTrend === 'declining' && (
                    <div className="flex items-start gap-2 text-red-400">
                      <span>📉</span>
                      <span>Quality is declining. Review recent outputs and adjust persona instructions.</span>
                    </div>
                  )}
                 {metrics.refinementRate>50 && (
                    <div className="flex items-start gap-2 text-orange-400">
                      <span>🔄</span>
                      <span>High refinement rate suggests outputs mayneed improvement. Review feedback patterns.</span>
                    </div>
                  )}
                  {metrics.knowledgeUtilizationRate<50 && (
                    <div className="flex items-start gap-2 text-blue-400">
                      <span>📚</span>
                      <span>Low knowledge utilization. Consider addingmore relevant documents or improving prompts.</span>
                    </div>
                  )}
                  {metrics.averageQualityScore > 80 && metrics.consistencyScore > 80 && (
                    <div className="flex items-start gap-2 text-green-400">
                      <span>✅</span>
                      <span>Excellent performance! The system is producing high-quality, consistent outputs.</span>
                    </div>
)}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
