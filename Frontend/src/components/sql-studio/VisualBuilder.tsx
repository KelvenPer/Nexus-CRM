"use client";

import React from "react";

interface VisualBuilderProps {
  onQueryChange: (query: string) => void;
}

const VisualBuilder: React.FC<VisualBuilderProps> = ({ onQueryChange }) => {
  return (
    <div className="visual-builder-canvas">
      <h2>Visual Query Builder</h2>
      <p>
        (Work in Progress) This canvas will allow users to drag and drop tables,
        create joins, and build queries visually.
      </p>
      <button
        onClick={() =>
          onQueryChange(
            "SELECT * FROM tb_placeholder -- Generated from Visual Builder"
          )
        }
      >
        Generate Placeholder Query
      </button>
    </div>
  );
};

export default VisualBuilder;
