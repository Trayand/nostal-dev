"use client";

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { indentWithTab, undo, redo } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { sql } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";

// CodeMirror 6 wrapped as a controlled-ish React component, plus a symbol
// toolbar for phones (typing { } ( ) ; on a mobile keyboard is painful).

export type EditorLanguage = "javascript" | "typescript" | "sql";

interface Props {
  value: string;
  onChange?: (value: string) => void;
  language: EditorLanguage;
  dark: boolean;
  readOnly?: boolean;
  label: string;
}

function languageExtension(lang: EditorLanguage) {
  if (lang === "sql") return sql();
  return javascript({ typescript: lang === "typescript" });
}

const baseTheme = EditorView.theme({
  "&": { fontSize: "15px", borderRadius: "0.75rem" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", minHeight: "10rem" },
  ".cm-content": { padding: "8px 0" },
  "&.cm-focused": { outline: "2px solid var(--accent)" },
});

const SYMBOLS = ["{", "}", "(", ")", "[", "]", ";", "=>", '"', "'", ":", "=", "<", ">"];

export function CodeEditor({ value, onChange, language, dark, readOnly = false, label }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const themeSlot = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Create the editor once per language/readOnly combination.
  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          languageExtension(language),
          EditorView.lineWrapping,
          EditorState.tabSize.of(2),
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          EditorView.contentAttributes.of({
            "aria-label": label,
            autocapitalize: "off",
            autocorrect: "off",
            spellcheck: "false",
          }),
          baseTheme,
          themeSlot.current.of(dark ? oneDark : []),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current?.(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // `value` is intentionally only the initial document; external changes are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, readOnly, label]);

  useEffect(() => {
    view.current?.dispatch({ effects: themeSlot.current.reconfigure(dark ? oneDark : []) });
  }, [dark]);

  // Sync external value changes (e.g. "reset code") without fighting user typing.
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  const insert = (text: string) => {
    const v = view.current;
    if (!v) return;
    v.dispatch(v.state.replaceSelection(text));
    v.focus();
  };

  // preventDefault on mousedown keeps focus (and the phone keyboard) in the editor.
  const keep = (e: React.MouseEvent) => e.preventDefault();
  const toolBtn = "min-h-11 min-w-11 shrink-0 rounded-lg border border-border bg-surface-2 px-2 font-mono text-base";

  return (
    <div className="flex flex-col gap-2">
      <div ref={host} className="overflow-hidden rounded-xl border border-border" />
      {!readOnly && (
        <div role="toolbar" aria-label="Simbol kode" className="flex gap-1.5 overflow-x-auto pb-1">
          <button type="button" className={toolBtn} onMouseDown={keep} onClick={() => insert("  ")}>Tab</button>
          {SYMBOLS.map((s) => (
            <button key={s} type="button" className={toolBtn} onMouseDown={keep} onClick={() => insert(s)} aria-label={`Sisipkan ${s}`}>
              {s}
            </button>
          ))}
          <button type="button" className={toolBtn} onMouseDown={keep} aria-label="Undo"
            onClick={() => view.current && undo(view.current)}>↶</button>
          <button type="button" className={toolBtn} onMouseDown={keep} aria-label="Redo"
            onClick={() => view.current && redo(view.current)}>↷</button>
        </div>
      )}
    </div>
  );
}
