import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScoreIndicator } from '../ScoreIndicator';

describe('ScoreIndicator', () => {
  it('renders with basic props', () => {
    render(<ScoreIndicator label="Test Score" score={75} />);
    
    expect(screen.getByText('Test Score')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('shows percentage when showPercentage is true', () => {
    render(<ScoreIndicator label="Test Score" score={85} showPercentage />);
    
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<ScoreIndicator label="Test" score={50} size="small" />);
    expect(document.querySelector('.score-indicator-small')).toBeInTheDocument();

    rerender(<ScoreIndicator label="Test" score={50} size="large" />);
    expect(document.querySelector('.score-indicator-large')).toBeInTheDocument();
  });

  it('renders SVG circle with correct attributes', () => {
    render(<ScoreIndicator label="Test" score={60} />);
    
    const circles = document.querySelectorAll('circle');
    expect(circles).toHaveLength(2); // Background and progress circles
    
    // Check that progress circle has stroke-dasharray and stroke-dashoffset
    const progressCircle = circles[1];
    expect(progressCircle).toHaveAttribute('stroke-dasharray');
    expect(progressCircle).toHaveAttribute('stroke-dashoffset');
  });

  it('applies custom className', () => {
    render(<ScoreIndicator label="Test" score={50} className="custom-class" />);
    
    expect(document.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('handles edge case scores', () => {
    const { rerender } = render(<ScoreIndicator label="Test" score={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();

    rerender(<ScoreIndicator label="Test" score={100} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('rounds decimal scores', () => {
    render(<ScoreIndicator label="Test" score={75.7} />);
    expect(screen.getByText('76')).toBeInTheDocument();
  });
});