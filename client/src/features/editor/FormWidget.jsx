// Shows one form field of the PDF as a normal HTML input,
// placed exactly over the field's position on the page.
export default function FormWidget({ annotation: a, box, scale, fields, setField }) {
  const name = a.fieldName;
  const stored = fields[name];
  const disabled = a.readOnly; // some PDF fields are marked read-only
  const style = { ...box, fontSize: Math.max(9, Math.min(box.height * 0.62, 16 * scale)) };

  if (a.fieldType === 'Tx') return <TextField {...{ a, name, stored, style, disabled, setField }} />;
  if (a.fieldType === 'Ch') return <ChoiceField {...{ a, name, stored, style, disabled, setField }} />;
  if (a.fieldType === 'Btn') return <ButtonField {...{ a, name, stored, style, disabled, setField }} />;
  return null; // signature fields etc. are not supported in this prototype
}

function TextField({ a, name, stored, style, disabled, setField }) {
  const initial = Array.isArray(a.fieldValue) ? a.fieldValue.join('\n') : a.fieldValue ?? '';
  const props = {
    className: 'w-input', style, title: name, disabled,
    value: stored ?? initial,
    maxLength: a.maxLen || undefined,
    onChange: (e) => setField(name, e.target.value),
  };
  return a.multiLine ? <textarea {...props} /> : <input type="text" {...props} />;
}

function ButtonField({ a, name, stored, style, disabled, setField }) {
  if (a.pushButton) return null;

  if (a.radioButton) {
    // Radio buttons in one group share the same field name. The value is the button that is selected.
    const current = stored ?? a.fieldValue;
    return (
      <input type="radio" className="w-check" style={style} name={name} disabled={disabled} title={`${name}: ${a.buttonValue}`}
        checked={current === a.buttonValue} onChange={() => setField(name, a.buttonValue)} />
    );
  }

  const checked = typeof stored === 'boolean' ? stored : Boolean(a.fieldValue) && a.fieldValue !== 'Off';
  return <input type="checkbox" className="w-check" style={style} disabled={disabled} title={name} checked={checked} onChange={(e) => setField(name, e.target.checked)} />;
}

function ChoiceField({ a, name, stored, style, disabled, setField }) {
  const options = (a.options ?? []).map((o) => <option key={o.exportValue} value={o.exportValue}>{o.displayValue}</option>);
  const first = Array.isArray(a.fieldValue) ? a.fieldValue[0] : a.fieldValue;

  if (a.combo) {
    return (
      <select className="w-input" style={style} value={stored ?? first ?? ''} disabled={disabled} title={name} onChange={(e) => setField(name, e.target.value)}>
        <option value="" />
        {options}
      </select>
    );
  }

  // otherwise it's a list box
  const selected = stored ?? (Array.isArray(a.fieldValue) ? a.fieldValue : a.fieldValue ? [a.fieldValue] : []);
  return (
    <select multiple={Boolean(a.multiSelect)} className="w-input" style={style} disabled={disabled} title={name}
      value={a.multiSelect ? selected : selected[0] ?? ''}
      onChange={(e) => setField(name, a.multiSelect ? [...e.target.selectedOptions].map((o) => o.value) : e.target.value)}>
      {options}
    </select>
  );
}
