import {button} from "@ui/Button";
import {container} from "@ui/Container";
import {textfield} from "@ui/inputs/TextField";


let form = container({
    items: [
        textfield({ value: "test" })
    ]
});

let btn = button({
    text: "Hello World",
    onClick: () => console.log("Hello World")
});

btn.mount(document.body);