import React, { useState, useEffect } from 'react';
import './ProcessingPipeline.css';

export function ProcessingPipeline() {
  const [currentPhase, setCurrentPhase] = useState(0);

  const phases = [
    {
      id: 1,
      name: 'Ingestion',
      icon: '📥',
      description: 'Receiving ticket...'
    },
    {
      id: 2,
      name: 'Triage',
      icon: '🔍',
      description: 'AI Analysis...'
    },
    {
      id: 3,
      name: 'Saleor Context',
      icon: '🛒',
      description: 'Code extraction...'
    },
    {
      id: 4,
      name: 'Creation',
      icon: '✨',
      description: 'Finalizing...'
    }
  ];

  // Auto-advance through phases
  useEffect(() => {
    if (currentPhase < phases.length) {
      const timer = setTimeout(() => {
        setCurrentPhase(currentPhase + 1);
      }, 1300);
      return () => clearTimeout(timer);
    }
  }, [currentPhase, phases.length]);

  return (
    <div className="processing-pipeline">
      <div className="pipeline-inner">
        <div className="pipeline-header">
          <h3>Processing Your Ticket</h3>
          <p>Watch the system create and classify your issue</p>
        </div>

        <div className="pipeline-stages">
          {phases.map((phase, index) => {
            const isActive = index === currentPhase;
            const isCompleted = index < currentPhase;

            return (
              <div key={phase.id} className="stage-wrapper">
                <div className={`stage ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                  <div className="stage-icon">
                    <span>{phase.icon}</span>
                  </div>
                  <div className="stage-label">
                    <p className="stage-name">{phase.name}</p>
                    <p className="stage-desc">{phase.description}</p>
                  </div>
                </div>
                
                {index < phases.length - 1 && (
                  <div className={`connector ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}>
                    <div className="connector-line"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pipeline-footer">
          <div className="progress-indicator">
            <div className="progress-dots">
              {phases.map((_, index) => (
                <div
                  key={index}
                  className={`dot ${index < currentPhase ? 'completed' : index === currentPhase ? 'active' : 'pending'}`}
                />
              ))}
            </div>
            {currentPhase === phases.length && (
              <p className="progress-text">✅ Complete!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

