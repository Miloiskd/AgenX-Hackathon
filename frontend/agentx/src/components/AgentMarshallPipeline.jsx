import React, { useState, useEffect } from 'react';
import './AgentMarshallPipeline.css';

export function AgentMarshallPipeline({ saleorContext, analysis, onComplete }) {
  const [currentStage, setCurrentStage] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const stages = [
    {
      id: 1,
      title: 'Initializing Analysis',
      icon: '🤖',
      description: 'Agent Marshall is waking up...',
      details: 'Loading ticket data and Saleor context'
    },
    {
      id: 2,
      title: 'Extracting Saleor Context',
      icon: '🛒',
      description: 'Reading codebase...',
      details: saleorContext 
        ? `Found ${saleorContext.codeSnippets?.length || 0} code snippets from ${new Set(saleorContext.codeSnippets?.map(s => s.file.split('/')[2])).size} modules`
        : 'Loading Saleor modules...'
    },
    {
      id: 3,
      title: 'Analyzing Issue',
      icon: '🔍',
      description: 'Understanding the problem...',
      details: analysis?.category 
        ? `Issue classified as: ${analysis.category} (${analysis.priority} priority)`
        : 'Analyzing with AI...'
    },
    {
      id: 4,
      title: 'Correlating Evidence',
      icon: '🔗',
      description: 'Connecting code to problem...',
      details: analysis?.root_cause 
        ? `Root cause: ${analysis.root_cause.substring(0, 50)}...`
        : 'Matching error patterns with code...'
    },
    {
      id: 5,
      title: 'Generating Solution',
      icon: '⚡',
      description: 'Crafting the fix...',
      details: analysis?.solution 
        ? `Solution prepared: ${analysis.solution.substring(0, 50)}...`
        : 'Determining optimal fix strategy...'
    },
    {
      id: 6,
      title: 'Verification',
      icon: '✅',
      description: 'Validating against Saleor...',
      details: 'Ensuring fix aligns with e-commerce patterns'
    },
    {
      id: 7,
      title: 'Resolution Complete',
      icon: '🎯',
      description: 'Agent Marshall has finished',
      details: 'All steps validated and documented'
    }
  ];

  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  useEffect(() => {
    if (currentStage < stages.length) {
      const timer = setTimeout(() => {
        setCurrentStage(currentStage + 1);
        if (currentStage === stages.length - 1) {
          setIsComplete(true);
        }
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [currentStage, stages.length]);

  return (
    <div className="agent-marshall-pipeline">
      <div className="agent-header">
        <div className="agent-title">
          <div className="agent-avatar">🤖</div>
          <div className="agent-info">
            <h3>Agent Marshall</h3>
            <p>{!isComplete ? 'Working on your ticket...' : 'Resolution complete!'}</p>
          </div>
        </div>
        <div className="agent-status">
          {isComplete ? (
            <span className="badge complete">✅ Resolved</span>
          ) : (
            <span className="badge working">⏳ Processing</span>
          )}
        </div>
      </div>

      <div className="stages-timeline">
        {stages.map((stage, index) => {
          const isActive = index === currentStage;
          const isCompleted = index < currentStage;
          const isPending = index > currentStage;

          return (
            <div key={stage.id} className="timeline-stage">
              <div className={`stage-dot ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isPending ? 'pending' : ''}`}>
                <span>{stage.icon}</span>
              </div>

              <div className={`stage-content ${isActive ? 'active' : ''}`}>
                <div className="stage-header">
                  <h4>{stage.title}</h4>
                  {isActive && <span className="stage-indicator">● Now</span>}
                  {isCompleted && <span className="stage-done">✓</span>}
                </div>

                <p className="stage-description">{stage.description}</p>

                {(isActive || isCompleted) && (
                  <div className="stage-details">
                    {stage.details}
                  </div>
                )}
              </div>

              {index < stages.length - 1 && (
                <div className={`stage-connector ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}></div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pipeline-context">
        {saleorContext && (
          <div className="context-box">
            <h4>📚 Saleor Context Reference</h4>
            <div className="context-items">
              {saleorContext.relevantComponents && (
                <div className="context-item">
                  <span className="label">Modules:</span>
                  <span className="value">{saleorContext.relevantComponents.slice(0, 3).join(', ')}</span>
                </div>
              )}
              {saleorContext.codeSnippets && (
                <div className="context-item">
                  <span className="label">Files:</span>
                  <span className="value">{saleorContext.codeSnippets.length} snippets</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pipeline-footer">
        <div className="progress-circle">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" className="progress-bg" />
            <circle 
              cx="50" 
              cy="50" 
              r="45" 
              className="progress-fill"
              style={{
                strokeDasharray: `${(currentStage / stages.length) * 283} 283`
              }}
            />
          </svg>
          <div className="progress-text">{Math.round((currentStage / stages.length) * 100)}%</div>
        </div>
      </div>
    </div>
  );
}
