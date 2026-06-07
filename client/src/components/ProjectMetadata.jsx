import React, { useState } from 'react';

const FIELD_GROUPS = [
  [
    { key: 'projectName', label: 'Project Name' },
    { key: 'projectAddress', label: 'Project Address' },
    { key: 'projectNumber', label: 'Project Number' },
  ],
  [
    { key: 'reviewType', label: 'Review Type' },
    { key: 'productType', label: 'Product Type' },
    { key: 'qaSpecialist', label: 'QA Specialist' },
  ],
  [
    { key: 'dateReviewed', label: 'Date Reviewed' },
    { key: 'pdiDrawingDate', label: 'PDI Drawing Date' },
    { key: 'codeYear', label: 'Code Year' },
  ],
  [
    { key: 'vdcOpsManager', label: 'VDC Ops Manager' },
    { key: 'vdcPM', label: 'VDC PM' },
    { key: 'vdcDesigner', label: 'VDC Designer' },
  ],
];

const DEFAULT_FIELDS = {
  projectName: '',
  projectAddress: '',
  projectNumber: '',
  reviewType: '',
  productType: '',
  qaSpecialist: '',
  dateReviewed: '',
  pdiDrawingDate: '',
  codeYear: '',
  vdcOpsManager: '',
  vdcPM: '',
  vdcDesigner: '',
};

export default function ProjectMetadata() {
  const [fields, setFields] = useState(() => {
    try {
      const saved = localStorage.getItem('voltqc_project_metadata');
      return saved ? JSON.parse(saved) : DEFAULT_FIELDS;
    } catch {
      return DEFAULT_FIELDS;
    }
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fields);

  const handleEdit = () => {
    setDraft(fields);
    setEditing(true);
  };

  const handleSave = () => {
    setFields(draft);
    localStorage.setItem('voltqc_project_metadata', JSON.stringify(draft));
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(fields);
    setEditing(false);
  };

  const isEmpty = !fields.projectName && !fields.projectNumber;

  return (
    <div className="border-b border-volt-border bg-volt-surface">
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-[10px] font-mono font-semibold text-volt-text-muted uppercase tracking-widest">
          Project Information
        </span>
        {!editing && (
          <button
            onClick={handleEdit}
            className="text-[10px] font-mono text-volt-red hover:text-volt-text transition-colors"
          >
            {isEmpty ? '+ ADD PROJECT INFO' : 'EDIT'}
          </button>
        )}
      </div>

      {isEmpty && !editing ? (
        <div className="px-4 pb-3">
          <button
            onClick={handleEdit}
            className="w-full border border-dashed border-volt-border rounded px-3 py-2 text-[11px] text-volt-text-muted hover:border-volt-red hover:text-volt-red transition-colors text-center"
          >
            Click to add project details
          </button>
        </div>
      ) : editing ? (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {FIELD_GROUPS.map((group, gi) =>
              group.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[9px] font-mono text-volt-text-muted uppercase mb-1">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={draft[key]}
                    onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                    className="w-full bg-volt-bg border border-volt-border rounded px-2 py-1 text-[11px] text-volt-text focus:outline-none focus:border-volt-red"
                    placeholder={label}
                  />
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-volt-red text-white text-[11px] font-mono rounded hover:opacity-90 transition-opacity"
            >
              SAVE
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 border border-volt-border text-volt-text-muted text-[11px] font-mono rounded hover:text-volt-text transition-colors"
            >
              CANCEL
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-3 grid grid-cols-3 gap-x-4 gap-y-1">
          {FIELD_GROUPS.flat().map(({ key, label }) =>
            fields[key] ? (
              <div key={key} className="flex items-baseline gap-1.5">
                <span className="text-[9px] font-mono text-volt-text-muted uppercase whitespace-nowrap">
                  {label}:
                </span>
                <span className="text-[11px] text-volt-text truncate">{fields[key]}</span>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}