import React, { useEffect, useMemo, useRef } from 'react';
import {
    FiBold,
    FiItalic,
    FiUnderline,
    FiList,
    FiLink,
    FiSlash,
    FiType,
} from 'react-icons/fi';

const sanitizeEditorHtml = (value) => {
    const html = String(value ?? '');

    return html
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
};

export const richTextToPlainText = (value) => {
    const html = sanitizeEditorHtml(value)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6)>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ');

    return html.replace(/\s+/g, ' ').trim();
};

const RichTextEditor = ({
    value = '',
    onChange,
    placeholder = 'Write here...',
    minHeight = 200,
}) => {
    const editorRef = useRef(null);
    const toolbarButtonClass = 'inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 transition hover:border-gray-300 hover:bg-gray-50';

    const hasContent = useMemo(() => {
        return richTextToPlainText(value).length > 0;
    }, [value]);

    useEffect(() => {
        const editorNode = editorRef.current;
        if (!editorNode) {
            return;
        }

        const normalized = sanitizeEditorHtml(value);
        if (editorNode.innerHTML !== normalized) {
            editorNode.innerHTML = normalized;
        }
    }, [value]);

    const emitChange = () => {
        if (!editorRef.current || typeof onChange !== 'function') {
            return;
        }

        const html = sanitizeEditorHtml(editorRef.current.innerHTML);
        onChange(html);
    };

    const focusEditor = () => {
        editorRef.current?.focus();
    };

    const runCommand = (command, commandValue = null) => {
        focusEditor();
        if (typeof document !== 'undefined') {
            document.execCommand(command, false, commandValue);
        }
        emitChange();
    };

    const handleCreateLink = () => {
        const rawUrl = window.prompt('Enter link URL');
        if (!rawUrl) {
            return;
        }

        const normalized = /^(https?:\/\/|mailto:|tel:)/i.test(rawUrl)
            ? rawUrl
            : `https://${rawUrl}`;

        runCommand('createLink', normalized);
    };

    return (
        <div className="rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 p-2">
                <button type="button" className={toolbarButtonClass} onClick={() => runCommand('bold')} title="Bold">
                    <FiBold />
                </button>
                <button type="button" className={toolbarButtonClass} onClick={() => runCommand('italic')} title="Italic">
                    <FiItalic />
                </button>
                <button type="button" className={toolbarButtonClass} onClick={() => runCommand('underline')} title="Underline">
                    <FiUnderline />
                </button>

                <button type="button" className={toolbarButtonClass} onClick={() => runCommand('formatBlock', 'P')} title="Paragraph">
                    <FiType className="mr-1" />
                    <span className="text-xs font-semibold">P</span>
                </button>
                <button type="button" className={toolbarButtonClass} onClick={() => runCommand('formatBlock', 'H2')} title="Heading 2">
                    <FiType className="mr-1" />
                    <span className="text-xs font-semibold">H2</span>
                </button>
                <button type="button" className={toolbarButtonClass} onClick={() => runCommand('formatBlock', 'H3')} title="Heading 3">
                    <FiType className="mr-1" />
                    <span className="text-xs font-semibold">H3</span>
                </button>

                <button type="button" className={toolbarButtonClass} onClick={() => runCommand('insertUnorderedList')} title="Bullet list">
                    <FiList />
                </button>
                <button type="button" className={toolbarButtonClass} onClick={() => runCommand('insertOrderedList')} title="Numbered list">
                    <span className="text-xs font-semibold">1.</span>
                </button>

                <button type="button" className={toolbarButtonClass} onClick={handleCreateLink} title="Add link">
                    <FiLink />
                </button>
                <button type="button" className={toolbarButtonClass} onClick={() => runCommand('unlink')} title="Remove link">
                    <FiSlash />
                </button>

                <button
                    type="button"
                    className={`${toolbarButtonClass} text-xs font-semibold`}
                    onClick={() => runCommand('removeFormat')}
                    title="Clear formatting"
                >
                    Clear
                </button>
            </div>

            <div className="relative">
                {!hasContent ? (
                    <div className="pointer-events-none absolute left-4 top-3 text-sm text-gray-400">
                        {placeholder}
                    </div>
                ) : null}
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={emitChange}
                    className="max-w-none px-4 py-3 text-sm leading-6 text-gray-800 outline-none [&_a]:text-blue-600 [&_a]:underline [&_h2]:my-2 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:my-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_ul]:ml-5 [&_ul]:list-disc"
                    style={{ minHeight: `${minHeight}px` }}
                />
            </div>
        </div>
    );
};

export default RichTextEditor;
