import { customElement } from 'lit/decorators.js';
import Keyboard from 'simple-keyboard';
import styles from './simple-keyboard/build/css/index.css';

// Global keyboard instance
let globalKeyboard: VirtualKeyboard;

@customElement('virtual-keyboard')
class VirtualKeyboard extends HTMLElement {
    private _input: HTMLInputElement | HTMLTextAreaElement | null;
    private _keyboardContainer: HTMLElement | null;
    private _hiding: boolean = false; // Set to true when hiding the keyboard
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
        this._hiding = false;
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

        // ha-dialog will try to make evertyhing else inert when it is open
        // but we want the keyboard to be active

        // Observe changes to the inert attribute on this element
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'inert') {
                    const target = mutation.target as HTMLElement;
                    if (target.hasAttribute('inert')) {
                        target.removeAttribute('inert');
                        console.log('Removed inert attribute from', target);
                    }
                }
            });
        });

        // Start observing this element for attribute changes
        observer.observe(this, {
            attributes: true,
            subtree: true,
            attributeFilter: ['inert']
        });
    }

    private focusListener = (event: Event) => {
        console.log("Focus event", event);
        this._input = event.target as HTMLInputElement | HTMLTextAreaElement;
        this._hiding = false;

        if (this.keyboard) {
            this.keyboard.setInput(this._input.value);
        }
        this._keyboardContainer.style.display = "block";
    };

    private blurListener = (event: Event) => {
        console.log("Blur event", event);
        if (event.target == this._input) {
            this._hiding = true;
            setTimeout(() => {
                if (this._hiding) {
                this._keyboardContainer.style.display = "none";
                }
            }, 300); // Hide keyboard after blur with delay
        }
    };

    private inputListener = (event: Event) =>{
        if (event.target == this._input) {
            console.log('Input value changed:', this._input.value);
            if (this.keyboard) {
                this.keyboard.setInput(this._input.value);
            }
        }
    };

    get input() {
        return this._input;
    }

    set input(input: HTMLInputElement | HTMLTextAreaElement | null) {
        console.log("Setting input", input, " previous input", this._input);
        this._input = input;

        if (!this.keyboard) {
            return;
        }
        if (!input) {
            this._hiding = true;
            setTimeout(() => {
                if (this._hiding) {
                    this._keyboardContainer.style.display = "none";
                }
            }, 300); // Hide keyboard after removal with delay
            return;
        }

        input.addEventListener("focus", this.focusListener);
        input.addEventListener("blur", this.blurListener);
        input.addEventListener("input", this.inputListener);
    }

    removeInput(input: HTMLInputElement | HTMLTextAreaElement) {
        input.removeEventListener("focus", this.focusListener);
        input.removeEventListener("blur", this.blurListener);
        input.removeEventListener("input", this.inputListener);
        if (this._input === input) {
            this.input = null;
        }
    }

    onChange(i : string) {
        if (!this._input) {
            return;
        }

        this._input.value = i;

        const inputEvent = new InputEvent('input', {
            inputType: 'insertText',
            composed: true,
            bubbles: true,
            isComposing: false,
            data: i,
        });

        this._input.dispatchEvent(inputEvent);

        const changeEvent = new Event('change', { bubbles: true });
        this._input.dispatchEvent(changeEvent);
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

function setupKeyboard(node : Element) {
    const inputs = node.querySelectorAll("textarea, input[type='text']"); // TODO: Bring up number pad keyboard for type='number'
    inputs.forEach(input => {
        if (input.classList.contains("keyboard-enabled")) return;

        input.classList.add("keyboard-enabled");

        globalKeyboard.input = input as HTMLInputElement | HTMLTextAreaElement;
    });
};

function traverseShadowRoots(root: Element) {
    if (root.shadowRoot) {
        const inputs = root.shadowRoot.querySelectorAll("textarea, input[type='text']");
        inputs.forEach(input => {
            if (input.classList.contains("keyboard-enabled")) {
                globalKeyboard.removeInput(input as HTMLInputElement | HTMLTextAreaElement);
            }
        });

        root.shadowRoot.querySelectorAll('*').forEach((descendant) => {
            if (descendant.shadowRoot) {
                traverseShadowRoots(descendant);
            }
        });
    }
};

function removeKeyboard(node: Element) {
    const inputs = node.querySelectorAll("textarea, input[type='text']");
    inputs.forEach(input => {
        if (input.classList.contains("keyboard-enabled")) {
            globalKeyboard.removeInput(input as HTMLInputElement | HTMLTextAreaElement);
        }
    });

    node.querySelectorAll('*').forEach((descendant) => {
        if (descendant.shadowRoot) {
            traverseShadowRoots(descendant);
        }
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
                mutation.removedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;
                        removeKeyboard(element);
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
    // Create a virtual keyboard in the document body
    globalKeyboard = document.createElement('virtual-keyboard') as VirtualKeyboard;
    document.body.appendChild(globalKeyboard);

    // Find mutations under home-assistant
    const main = document.querySelectorAll('home-assistant');
    main.forEach(observeShadowRoot);
};

if (document.readyState === 'complete') {
    docObserver();
} else {
    window.addEventListener("load", () => {
        docObserver();
    });
}

