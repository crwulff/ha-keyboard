import { customElement } from 'lit/decorators.js';
import Keyboard from 'simple-keyboard';
import styles from './simple-keyboard/build/css/index.css';

function findEnclosingDialog(element: Element): Element | ShadowRoot | null {
  let current : Element | null = element;
//  return document.body;

  while (current) {
    const shadowRoot = current.shadowRoot;

    //if (current.localName == 'ha-textfield') {
    //    return shadowRoot;
    //}
    if (current.localName == 'ha-dialog') {
        return (shadowRoot) ? shadowRoot.firstElementChild : null;
    }
    if ("ha-drawer" == current.localName && current.shadowRoot) {
        return (shadowRoot) ? shadowRoot.querySelectorAll(".mdc-drawer-app-content")[0] : null;
    }

    // Move to the parent node or shadow root host
    if (current.parentElement) {
        current = current.parentElement;
     } else {
        const parentShadowRoot = current.parentNode as ShadowRoot;
        current = (parentShadowRoot) ? parentShadowRoot.host : null;
     }
  }

  return null; // No enclosing dialog found
}

@customElement('virtual-keyboard')
class VirtualKeyboard extends HTMLElement {
    private _input: HTMLInputElement | HTMLTextAreaElement | null;
    private _keyboardContainer: HTMLElement | null;
    keyboard: Keyboard | null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <div class="simple-keyboard">
            </div>
        `;
        this._input = null;
        this._keyboardContainer = null;
    }

    connectedCallback() {
        this._keyboardContainer = this.shadowRoot.querySelector(".simple-keyboard") as HTMLElement;

        this._keyboardContainer.style.position = 'absolute';
        this._keyboardContainer.style.zIndex = "1000";

        // TODO: Pick top or bottom based on where the input field is
        this._keyboardContainer.style.bottom = "0";
        this._keyboardContainer.style.left = "0";

        // Start initially hidden. A focus event will show the keyboard.
        this._keyboardContainer.style.display = "none";

        const style = document.createElement('style');
        style.textContent = styles;
        this._keyboardContainer.appendChild(style);

        this.keyboard = new Keyboard(this._keyboardContainer);

        this.keyboard.setOptions({
            onChange: (i : string) => this.onChange(i),
            onKeyPress: (button : string) => this.onKeyPress(button),
            onKeyRelease: (button : string) => this.onKeyRelease(button),
            disableButtonHold: true,
            debug: true
        });

        // Prevent mousedown from removing focus from the input element
        this.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            e.preventDefault();
        });

        // Prevent mouseup from removing focus from the input element
        this.addEventListener("mouseup", (e) => {
            e.stopPropagation();
            e.preventDefault();
        });
    }

    get input() {
        return this._input;
    }

    set input(input: HTMLInputElement | HTMLTextAreaElement | null) {
        this._input = input;

        if (!this.keyboard || !input) {
            return;
        }

        input.addEventListener("focus", () => {
            if (this.keyboard) {
                this.keyboard.setInput(input.value);
            }
            this._keyboardContainer.style.display = "block";
        });

        input.addEventListener("blur", () => {
            setTimeout(() => {
                this._keyboardContainer.style.display = "none";
            }, 300); // Hide keyboard after blur with delay
        });

        input.addEventListener('input', () => {
            console.log('Input value changed:', input.value);
            if (this.keyboard) {
                this.keyboard.setInput(input.value);
            }
        });
    }

    onChange(i : string) {
        if (!this.input) {
            return;
        }

        this.input.value = i;

        const inputEvent = new InputEvent('input', {
            inputType: 'insertText',
            composed: true,
            bubbles: true,
            isComposing: false,
            data: i,
        });

        this.input.dispatchEvent(inputEvent);

        const changeEvent = new Event('change', { bubbles: true });
        this.input.dispatchEvent(changeEvent);
    }

    onKeyPress(button : string) {
        console.log("Button pressed", button);

        if (button === "{shift}" || button === "{lock}") {
            this.handleShift();
        }
    }

    onKeyRelease(button : string) {
        console.log("Button released", button);
    }

    handleShift() {
        if (!this.keyboard) {
            return;
        }

        let currentLayout = this.keyboard.options.layoutName;
        let shiftToggle = currentLayout === "default" ? "shift" : "default";

        this.keyboard.setOptions({
            layoutName: shiftToggle
        });
    }
}

const setupKeyboard = (node : Element) => {
    //console.log("setupKeyboard");
    const inputs = node.querySelectorAll("textarea, input[type='text']"); // TODO: Bring up number pad keyboard for type='number'
    inputs.forEach(input => {
        if (input.classList.contains("keyboard-enabled")) return;

        input.classList.add("keyboard-enabled");

        const keyboard = document.createElement('virtual-keyboard') as VirtualKeyboard;

        const dialog = findEnclosingDialog(input);
        if (dialog) {
          dialog.appendChild(keyboard);
        } else {
          document.body.appendChild(keyboard);
        }

        keyboard.input = input as HTMLInputElement | HTMLTextAreaElement;
    });
};

function observeShadowRoot(root : Element) {
    if (root.shadowRoot) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;
                        setupKeyboard(element);
                        // If the node has a shadowRoot, observe it
                        if (element.shadowRoot) {
                            observeShadowRoot(element);
                        }

                        // Traverse descendants for shadow roots
                        element.querySelectorAll('*').forEach((descendant) => {
                            if (descendant.shadowRoot) {
                                observeShadowRoot(descendant); // Recursively observe
                            }
                        });
                    }
                });
            });
        });

        observer.observe(root.shadowRoot, {
            childList: true,
            subtree: true,
        });
    }
}

const docObserver = () => {
    // Example: Observing a Lovelace card
    const main = document.querySelectorAll('home-assistant');
    main.forEach(observeShadowRoot);
};

if (document.readyState === 'complete') {
    docObserver();
} else {
    window.addEventListener("load", () => {
        docObserver();
        new MutationObserver(docObserver).observe(document.body, { childList: true, subtree: true });
    });
}

