import {card} from "@ui/Card";
import {button} from "@ui/Button";
import {State} from "@state/State";
import {html} from "uhtml";
import {container} from "@ui/Container";
import {flexLayout} from "@ui/layouts/FlexLayout";
import { icon } from "@ui/Icon";
import "./tw-safelist";
import {alert, error, info, success} from "@ui/Alert";
import {avatar} from "@ui/Avatar";
import {indicator} from "@ui/decorators/Indicator";
import {badge} from "@ui/Badge";
import {status} from "@ui/Status";
import {textfield} from "@ui/inputs/TextField";
import {checkbox} from "@ui/inputs/Checkbox";
import {radio} from "@ui/inputs/Radio";
import {content} from "@ui/Content";
import {avatarGroup} from "@ui/AvatarGroup";
import {dropdown} from "@ui/Dropdown";
import {link} from "@ui/Link";

const s = new State({
    text: "Example",
    loading: false,
    icon: "adjustments-code",
    todos: ["a","b","c"],
    valid: true
}, {
    schema: {
        type: "object",
        required: ['text'],
        properties: {
            text: { type: 'string', minLength: 3 }
        }
    },
    validateOnWrite: true
});

s.on("loading", (v) => console.log("loading changed to", v), { immediate: false });
s.onValidationChange(evt => { console.log("Error?", evt); s.valid = evt.valid; })

let c = container({
    layout: flexLayout({ direction: "row", gap: "1rem", align: "end" }),
    items: [
        card({
            //title: "{text}",
            size: "md",
            imageSrc: "https://cdn.flyonui.com/fy-assets/components/card/image-9.png",
            imagePlacement: 'bottom',
            content: container({
                layout: flexLayout({ direction: "column", gap: "1rem" }),
                items: [
                    (s) => html`<p>Ciao, questo è reattivo! <b>${s.text}</b></p>`,
                    (s) => html`<li>${s.todos.map((t) => html`<li>${t}</li>`)}</li>`,
                    textfield({
                        label: "Text field",
                        labelMode: "inline",
                        value: "{text}",
                        decorators: [
                            indicator({
                                active: "{!valid}",
                                content: status({ color: "error", animation: "ping" })
                            })
                        ]}),
                    checkbox({ label: "Check box", value: "{valid}" }),
                    radio({ label: "Radio"})
                ]
            }),
            //headerActions: [{ icon: "refresh" },{}],
            actionsClassName: "justify-end",
            actions: [{ text: "{text}", icon: "x", color: "primary" }],
            alert: { icon: "alert-square", variant: "soft", color: "error", hidden: "{valid}", content: "Attenzione!"}
        }),
        button({
            text: "{text}",
            icon: "accessible",
            color: "info",
            loading: "{loading}",
            disabled: "{!valid}",
            onClick: (btn, ev) => { btn.state().loading = true; },
            decorators: [
                indicator({
                    active: true,
                    //content: badge({ color:"error", text: "ciao",  })
                    content: icon("{icon}")
                })
            ]
        }),
        status({ color: "error", animation: "pulse" }),
        badge({color: "error", text: "test", icon: "accessible" }),
        icon({ icon: "{icon}", className: "color-green" }),
        avatar({
            src: "https://cdn.flyonui.com/fy-assets/avatar/avatar-1.png",
            decorators: [
                indicator({
                    active: true,
                    //content: badge({ color:"error", text: "ciao",  })
                    //content: status({ color: "error", animation: "ping" }),
                    items: [{
                        position: "bottom-end",
                        content: status({ color: "error", animation: "ping" })
                    }]
                })
            ]
        }),
        avatarGroup({
            avatars: [
                avatar("https://cdn.flyonui.com/fy-assets/avatar/avatar-1.png"),
                avatar("https://cdn.flyonui.com/fy-assets/avatar/avatar-2.png")
            ]
        }),
        link({ text: "Il mio bel link" }),
        dropdown({ items: [
            { type: "link", text: "Item 1" },
            { type: "link", text: "Item 2" }
        ]})
    ]
});

// @ts-ignore
c.mount(document.getElementById("app"), s);

// @ts-ignore
window["s"] = s;
