import React, { useEffect, useState } from 'react';
import { KnowledgeProcessingService } from '../services/knowledgeProcessingService';
import { FeedbackService } from '../services/feedbackService';

interface KnowledgeQualityDashboardProps {
  onClose: () => void;
}

const KnowledgeQualityDashboard: React.FC<KnowledgeQualityDashboardProps> = ({ onClose }) => {
  const [knowledgeStats, setKnowledgeStats] = useState<any>(null);
  const [feedbackStats, setFeedbackStats] = useState<any>(null);
  const [editQualityStats, setEditQualityStats] = useState<any>(null);

  const knowledgeProcessingService = KnowledgeProcessingService.getInstance();
  const feedbackService = FeedbackService.getInstance();

  useEffect(() => {
    // Load knowledge stats
    const knowledgeStats = knowledgeProcessingService.getKnowledgeQualityStats();
    setKnowledgeStats(knowledgeStats);

    // Load feedback stats
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

    // Load edit quality stats
    const editQualityStats = feedbackService.getEditQualityStats();
    setEditQualityStats(editQualityStats);
  }, [knowledgeProcessingService, feedbackService]);

  const StatCard: React.FC<{ title: string; value: string | number; description?: string; color?: string }> = 
  ({ title, value, description, color = 'bg-indigo-600' }) => (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
      <div className={`text-2xl font-bold text-slate-100 ${color}`}>{value}</div>
      {description && <p className="text-slate-500 text-xs mt-1">{description}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-100">Knowledge & Feedback Analytics</h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {knowledgeStats && (
              <>
                <StatCard 
                  title="Avg. Knowledge Quality" 
                  value={`${Math.round(knowledgeStats.avgQuality)}/100`} 
                  color={knowledgeStats.avgQuality >= 80 ? 'text-green-400' : knowledgeStats.avgQuality >= 50 ? 'text-yellow-400' : 'text-red-400'}
                />
                <StatCard 
                  title="High Quality Sources" 
                  value={knowledgeStats.highQualityCount} 
                  description={`of ${knowledgeStats.totalSources} total`}
                />
                <StatCard 
                  title="Processed Sources" 
                  value={knowledgeStats.totalSources} 
                />
                <StatCard 
                  title="Quality Distribution" 
                  value={`${knowledgeStats.qualityDistribution.high || 0}H/${knowledgeStats.qualityDistribution.medium || 0}M/${knowledgeStats.qualityDistribution.low || 0}L`} 
                  description="High/Medium/Low"
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {feedbackStats && (
              <>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h3 className="text-slate-400 text-sm font-medium mb-3">Feedback Distribution</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">Manual Ratings</span>
                        <span className="text-slate-400">{feedbackStats.manualRatings}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${feedbackStats.totalFeedbacks ? (feedbackStats.manualRatings / feedbackStats.totalFeedbacks * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">Refinement Feedback</span>
                        <span className="text-slate-400">{feedbackStats.refinementFeedbacks}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${feedbackStats.totalFeedbacks ? (feedbackStats.refinementFeedbacks / feedbackStats.totalFeedbacks * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">Quality Checks</span>
                        <span className="text-slate-400">{feedbackStats.qualityCheckFeedbacks}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${feedbackStats.totalFeedbacks ? (feedbackStats.qualityCheckFeedbacks / feedbackStats.totalFeedbacks * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {editQualityStats && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-slate-400 text-sm font-medium mb-3">Edit Quality Metrics</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">Clarity</span>
                      <span className="text-slate-400">{Math.round(editQualityStats.avgClarity)}/100</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-cyan-500 h-2 rounded-full" 
                        style={{ width: `${editQualityStats.avgClarity}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">Accuracy</span>
                      <span className="text-slate-400">{Math.round(editQualityStats.avgAccuracy)}/100</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${editQualityStats.avgAccuracy}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">Relevance</span>
                      <span className="text-slate-400">{Math.round(editQualityStats.avgRelevance)}/100</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ width: `${editQualityStats.avgRelevance}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">Overall Quality</span>
                      <span className="text-slate-400">{Math.round(editQualityStats.avgOverall)}/100</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full" 
                        style={{ width: `${editQualityStats.avgOverall}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium mb-3">How to Improve Knowledge Quality</h3>
            <ul className="text-slate-300 text-sm space-y-2">
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>Provide detailed, well-structured source documents for better processing</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>Give specific feedback when refining documents to help train the system</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>Rate documents regularly to help identify quality patterns</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>Use diverse sources to create richer knowledge relationships</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeQualityDashboard;