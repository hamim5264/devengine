import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import DevKittyAnimatedIcon from "@/components/common/DevKittyAnimatedIcon";
import { useDevKitty } from "./DevKittyProvider";
import DevKittyAnswer from "./DevKittyAnswer";
import s from "./DevKittyPanel.module.css";
const PROMPTS = {
  visitor: ["Tell me about the DevEngine blog", "Help me find a project", "What services do you offer?"],
  employee: ["What are my current tasks?", "How do I submit my daily update?", "Show my leave requests"],
  admin: ["Which tasks need attention?", "Show pending leave requests", "Where can I manage DevKitty?"],
};
export default function DevKittyPanel() {
  const kitty = useDevKitty(); const { theme } = useTheme(); const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null), scroll = useRef<HTMLDivElement>(null), textarea = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState(""); const [composing, setComposing] = useState(false);
  useEffect(() => {
    const element = dialog.current, previous = document.activeElement as HTMLElement | null;
    element?.showModal(); const old = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = old; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => { const element = scroll.current; if (element) element.scrollTop = element.scrollHeight; }, [kitty.messages, kitty.sending, kitty.error]);
  useEffect(() => { if (textarea.current) { textarea.current.style.height = "auto"; textarea.current.style.height = `${Math.min(textarea.current.scrollHeight, 128)}px`; } }, [input]);
  const enabled = !!kitty.bootstrap && !kitty.loading && (!kitty.bootstrap.enabled || kitty.bootstrap.configured);
  async function send(value = input) { if (!value.trim() || !enabled || kitty.sending) return; setInput(""); await kitty.send(value); }
  return <dialog ref={dialog} className={s.dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); kitty.close(); }} onClick={event => { if (event.target === event.currentTarget) kitty.close(); }}>
    <div className={s.panel}>
      <header className={s.header}><div className={s.identity}><DevKittyAnimatedIcon size={46} active={true} isLight={theme === "light"} /><div><h2 id={titleId}>DevKitty<span /></h2><p>{kitty.bootstrap?.role === "employee" ? "Your workspace companion" : kitty.bootstrap?.role === "admin" ? "Your studio companion" : "Your DevEngine companion"}</p></div></div><div className={s.headerActions}><button type="button" disabled={kitty.sending} onClick={kitty.reset} aria-label="Start a new conversation" title="New conversation"><span className="material-symbols-outlined" aria-hidden="true">edit_square</span></button><button type="button" onClick={kitty.close} aria-label="Close DevKitty"><span className="material-symbols-outlined" aria-hidden="true">close</span></button></div></header>
      <div className={s.conversation} ref={scroll}>
        <div className={s.sessionLabel}>{kitty.bootstrap ? { visitor: "Explore DevEngine", employee: "Employee workspace", admin: "Admin workspace" }[kitty.bootstrap.role] : "Connecting to DevKitty"}</div>
        {kitty.loading && <p className={s.status} role="status">Opening your conversation, bunny…</p>}
        <div role="log" aria-label="DevKitty conversation" aria-live="polite" aria-relevant="additions text" className={s.messages}>{kitty.messages.map(message => <article key={message.id} className={s.message} data-role={message.role}>{message.role === "assistant" && <div className={s.responseAvatar} aria-hidden="true"><DevKittyAnimatedIcon size={34} active={true} isLight={theme === "light"} /></div>}<div className={s.messageContent}><span className={s.author}>{message.role === "assistant" ? "DevKitty" : "You"}</span><div className={s.bubble}>{message.role === "assistant" ? <DevKittyAnswer text={message.content} links={message.links} sources={message.sources} /> : <p>{message.content}</p>}</div>{!!message.links?.length && <div className={s.links}>{message.links.map(link => <Link href={link.url} key={link.url} onClick={kitty.close}><span>{link.title}</span><span className="material-symbols-outlined" aria-hidden="true">arrow_outward</span></Link>)}</div>}{!!message.sources?.length && <div className={s.sources}><span>Sources</span>{message.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title || "Web source"}</a>)}</div>}{message.truncated && <p className={s.note}>Ask me to continue if you’d like more detail, bunny.</p>}</div></article>)}</div>
        {kitty.sending && <div className={s.typing} role="status" aria-label="DevKitty is preparing an answer"><span /><span /><span /><p>Looking into that, bunny…</p></div>}
        {!kitty.sending && kitty.messages.length <= 1 && enabled && kitty.bootstrap?.enabled && <div className={s.suggestions}>{PROMPTS[kitty.bootstrap!.role].map(prompt => <button key={prompt} type="button" onClick={() => send(prompt)}>{prompt}<span aria-hidden="true">↗</span></button>)}</div>}
        {kitty.error && <div className={s.error} role="alert"><p>{kitty.error}</p><button onClick={kitty.retry} disabled={kitty.sending || kitty.loading}>Try again</button></div>}
        {kitty.bootstrap?.enabled && !kitty.bootstrap.configured && <div className={s.status}><p>DevKitty needs an AI connection before it can answer, bunny.</p>{kitty.bootstrap.role === "admin" ? <Link href="/admin/manage-devkitty" onClick={kitty.close}>Connect DevKitty →</Link> : <p>Please check back after administration connects the service.</p>}<button className={s.refresh} onClick={kitty.reload}>Refresh connection</button></div>}
      </div>
      <form className={s.composer} onSubmit={event => { event.preventDefault(); void send(); }}><label htmlFor={`${titleId}-input`} className={s.inputLabel}>Message DevKitty</label><div className={s.inputRow}><textarea className="transparent-input" ref={textarea} id={`${titleId}-input`} rows={1} value={input} maxLength={kitty.bootstrap?.maxInputLength || 3000} placeholder="Ask me anything, bunny…" disabled={!enabled || kitty.sending} onChange={event => setInput(event.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !composing && !event.nativeEvent.isComposing && window.matchMedia("(min-width: 761px)").matches) { event.preventDefault(); void send(); } }} /><button type="submit" disabled={!input.trim() || !enabled || kitty.sending} aria-label="Send message"><span className="material-symbols-outlined" aria-hidden="true">arrow_upward</span></button></div><div className={s.composerFooter}><span>AI-assisted · {kitty.bootstrap?.role === "visitor" ? "Public studio knowledge" : "Role-aware workspace"}</span><span>{input.length ? `${input.length} / ${kitty.bootstrap?.maxInputLength || 3000}` : "Shift + Enter for a new line"}</span></div></form>
    </div>
  </dialog>;
}
