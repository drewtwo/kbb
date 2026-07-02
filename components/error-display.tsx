import React from 'react';

interface ErrorDisplayProps {
  /** Human-readable title shown above the message */
  title?: string;
  /** The error message to display */
  message: string;
}

/**
 * A simple, accessible error display component used to surface API or data
 * errors to the user without crashing the page.
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Something went wrong',
  message,
}) => {
  return (
    <div
      role="alert"
      style={{
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        backgroundColor: '#fff3f3',
        color: '#721c24',
        padding: '1rem 1.5rem',
        margin: '1rem 0',
      }}
    >
      <strong>{title}</strong>
      <p style={{ margin: '0.5rem 0 0' }}>{message}</p>
    </div>
  );
};

export default ErrorDisplay;
