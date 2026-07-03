import React, { useState } from "react";
import { useOrgChart } from "../context/OrgChartContext";
import { Plus, RotateCcw, Globe } from "lucide-react";

export default function Header({ lang, onLangToggle }) {
  const { addNode, resetData, state } = useOrgChart();
  const centralId = (state.children["root-ministry"] || [])[0];

  return (
    <header className="app-header">
      {/* Ministry branding */}
      <div className="header-brand">
        <div className="header-emblem">🏛️</div>
        <div className="header-titles">
          <div className="header-title-kh">ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ</div>
          <div className="header-title-en">Ministry of Economy and Finance</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="header-toolbar">
        <button className="toolbar-btn primary" onClick={() => {
          if (centralId) addNode(centralId, "ផ្នែកថ្មី", "New Division", "division");
        }}>
          <Plus size={15} /> Add Division
        </button>
        <button className="toolbar-btn" onClick={onLangToggle}>
          <Globe size={15} /> {lang === "kh" ? "English" : "ខ្មែរ"}
        </button>
        <button className="toolbar-btn danger" onClick={() => {
          if (window.confirm("Reset all data to default?")) resetData();
        }}>
          <RotateCcw size={15} /> Reset
        </button>
      </div>
    </header>
  );
}
