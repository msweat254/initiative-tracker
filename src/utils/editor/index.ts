import { EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { basicSetup } from "./extensions";
import { materialPalenight } from "./theme-dark";
import { basicLightTheme } from "./theme-light";

export function editorFromTextArea(
    textarea: HTMLTextAreaElement,
    facet?: Extension
) {
    const extensions = [...basicSetup];
    if (activeDocument.body.hasClass("theme-dark")) {
        extensions.push(materialPalenight);
    } else {
        extensions.push(basicLightTheme);
    }
    if (facet) extensions.push(facet);
    let view = new EditorView({
        state: EditorState.create({
            doc: textarea.value,
            extensions
        })
    });
    textarea.parentNode!.appendChild(view.dom);
    textarea.addClass("initiative-tracker-editor-source");
    if (textarea.form)
        textarea.form.addEventListener("submit", () => {
            textarea.value = view.state.doc.toString();
        });
    return view;
}
