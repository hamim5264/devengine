import React, { Children, isValidElement, useRef, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import CustomSelectField, { type SelectOption } from "@/components/staff/CustomSelectField";
import CustomDatePickerField from "@/components/staff/CustomDatePickerField";

function optionText(children: ReactNode): string {
  return Children.toArray(children).map(child => isValidElement<{ children?: ReactNode }>(child) ? optionText(child.props.children) : String(child)).join("");
}
function optionsFrom(children: ReactNode, group = "", disabled = false): SelectOption[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ value?: string | number; label?: string; children?: ReactNode; disabled?: boolean }>(child)) return [];
    if (child.type === "option") {
      const text = optionText(child.props.children);
      return [{ value: String(child.props.value ?? text), label: text, description: group || undefined, disabled: disabled || child.props.disabled }];
    }
    return optionsFrom(child.props.children, child.type === "optgroup" ? child.props.label : group, disabled || child.props.disabled);
  });
}
const hiddenStyle: React.CSSProperties = { position: "absolute", width: 1, height: 1, minHeight: 0, padding: 0, opacity: 0, clipPath: "inset(50%)", pointerEvents: "none" };

/** Native form semantics and existing change handlers, with the studio dropdown. */
export function AdminSelect({ children, className = "", value, defaultValue, id, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const native = useRef<HTMLSelectElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const options = optionsFrom(children);
  const [local, setLocal] = useState(String(defaultValue ?? options.find(option => !option.disabled)?.value ?? ""));
  const current = String(value ?? local);
  return <div ref={root} className={`admin-custom-control ${className}`}>
    <select {...props} ref={native} value={current} tabIndex={-1} aria-hidden="true" style={hiddenStyle} onInvalid={event => { event.preventDefault(); root.current?.querySelector<HTMLButtonElement>("button")?.focus(); }} onFocus={() => root.current?.querySelector<HTMLButtonElement>("button")?.focus()}>{children}</select>
    <CustomSelectField floating id={id} ariaLabel={props["aria-label"] || props.title || "Choose an option"} value={current} options={options} disabled={props.disabled} onChange={next => {
      setLocal(next);
      if (native.current) { native.current.value = next; native.current.dispatchEvent(new Event("change", { bubbles: true })); }
    }} />
  </div>;
}

/** Dates, month filters and shift times share the studio calendar/dropdowns. */
export function AdminDateInput({ type = "date", value, defaultValue, className = "", id, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const native = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [local, setLocal] = useState(String(defaultValue ?? ""));
  const current = String(value ?? local);
  const commit = (next: string) => {
    setLocal(next);
    if (!native.current) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(native.current, next);
    native.current.dispatchEvent(new Event("input", { bubbles: true }));
    native.current.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const date = type === "month" ? current ? `${current}-01` : "" : current.split("T")[0];
  const time = type === "time" ? current : current.split("T")[1] || "";
  const [hour = "", minute = ""] = time.split(":");
  const setTime = (next: string) => commit(type === "time" ? next : `${date || (() => { const today = new Date(); return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`; })()}T${next}`);
  const label = props["aria-label"] || props.title || props.placeholder || (type === "time" ? "Choose time" : "Choose date");
  return <div ref={root} className={`admin-custom-control admin-date-control ${className}`}>
    <input {...props} type={type} ref={native} value={current} tabIndex={-1} aria-hidden="true" style={hiddenStyle} onInvalid={event => { event.preventDefault(); root.current?.querySelector<HTMLButtonElement>("button")?.focus(); }} onFocus={() => root.current?.querySelector<HTMLButtonElement>("button")?.focus()} />
    {type !== "time" && <CustomDatePickerField floating id={id} ariaLabel={label} value={date} disabled={props.disabled || props.readOnly} minDate={props.min ? String(props.min).slice(0, 10) : undefined} maxDate={props.max ? String(props.max).slice(0, 10) : undefined} placeholder={type === "month" ? "Choose month" : "Choose date"} onChange={next => commit(type === "month" ? next.slice(0, 7) : type === "datetime-local" ? `${next}T${time || "00:00"}` : next)} />}
    {(type === "time" || type === "datetime-local") && <div className="admin-time-controls">
      <CustomSelectField floating id={type === "time" ? id : undefined} ariaLabel={`${label}: hour`} value={hour} placeholder="Hour" disabled={props.disabled || props.readOnly} options={Array.from({ length: 24 }, (_, index) => ({ value: String(index).padStart(2, "0"), label: String(index).padStart(2, "0") }))} onChange={next => setTime(`${next}:${minute || "00"}`)} />
      <span aria-hidden="true">:</span>
      <CustomSelectField floating ariaLabel={`${label}: minute`} value={minute} placeholder="Min" disabled={props.disabled || props.readOnly} options={Array.from({ length: 60 }, (_, index) => ({ value: String(index).padStart(2, "0"), label: String(index).padStart(2, "0") }))} onChange={next => setTime(`${hour || "00"}:${next}`)} />
    </div>}
  </div>;
}
