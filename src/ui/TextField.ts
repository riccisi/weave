import {html} from "uhtml";
import {Component, StateInit} from "./Component";
import {ComponentRegistry} from "./Registry";

export interface TextFieldState {
    value: string;
    disabled: boolean;
    placeholder: string;
    name: string;
    label: string | null;
}

export class TextField extends Component<TextFieldState> {

    static wtype = "textfield";

    protected stateInit: StateInit = {
        value: "",
        disabled: false,
        placeholder: "",
        name: "",
        label: null,
    };

    protected view() {
        const s = this.state();
        return html`
            <div class="w-full">
                ${s.label ? html`<label class="label-text">${s.label}</label>` : null}
                <input
                    class="input input-bordered w-full"
                    name=${s.name}
                    placeholder=${s.placeholder}
                    .value=${s.value}
                    ?disabled=${s.disabled}
                    oninput=${(e: Event) => {
                        s.value = (e.target as HTMLInputElement).value;
                    }}
                />
            </div>
        `;
    }
}

// AUTO-REGISTER
ComponentRegistry.registerClass(TextField);