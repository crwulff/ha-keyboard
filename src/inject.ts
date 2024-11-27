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

        this._keyboardContainer.style.position = 'fixed';
        this._keyboardContainer.style.zIndex = "1000";

        // Start initially hidden. A focus event will show the keyboard.
        this._keyboardContainer.style.display = "none";

        const style = document.createElement('style');
        style.textContent = `
            ${styles}
            .simple-keyboard {
                top: auto;
                bottom: 0;
                transition: transform 300ms ease-in-out;
                transform: translateY(100%);
                background: var(--primary-background-color);
                color: var(--primary-text-color);
            }
            .simple-keyboard.visible {
                transform: translateY(0);
            }
            .simple-keyboard.top {
                top: 0;
                bottom: auto;
                transform: translateY(-100%);
            }
            .simple-keyboard.top.visible {
                transform: translateY(0);
            }
            .simple-keyboard .hg-button {
                background: var(--lcars-ui-quaternary);
                color: var(--text-dark-color);
            }
            .hg-theme-default .hg-button.hg-standardBtn[data-skbtn="@"] {
                max-width: 100%;
            }
            .simple-keyboard .hg-button.key-top {
                background: var(--lcars-ui-tertiary);
                color: var(--text-dark-color);
            }
            .simple-keyboard .hg-button.key-bottom {
                background: var(--lcars-ui-secondary);
                color: var(--text-dark-color);
            }
            .simple-keyboard .hg-button.key-hide,
            .simple-keyboard .hg-button-at,
            .simple-keyboard .hg-button-abc,
            .simple-keyboard .hg-button-ABC {
                max-width: 60px;
            }
            .simple-keyboard .hg-button.key-hide::before {
                content: '';
                display: block;
                width: 24px;
                height: 24px;
                background: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 5H20V15H4V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 9H8.01M12 9H12.01M16 9H16.01M8 13H8.01M12 13H12.01M16 13H16.01M12 17L12 21M12 21L15 18M12 21L9 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>') no-repeat center center;
                background-size: contain;
                color: var(--text-dark-color);
            }
        `;
        this._keyboardContainer.appendChild(style);

        this.keyboard = new Keyboard(this._keyboardContainer);

        this.keyboard.setOptions({
            onChange: (i : string) => this.onChange(i),
            onKeyPress: (button : string) => this.onKeyPress(button),
            onKeyRelease: (button : string) => this.onKeyRelease(button),
            disableButtonHold: true,
            layout: {
                'default': [
                    '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
                    'q w e r t y u i o p [ ] \\',
                    'a s d f g h j k l ; \'',
                    'z x c v b n m , . /',
                    '{ABC} {at} {space} {hide}'
                ],
                'shift': [
                    '~ ! @ # $ % ^ &amp; * ( ) _ + {bksp}',
                    'Q W E R T Y U I O P { } |',
                    'A S D F G H J K L : "',
                    'Z X C V B N M &lt; &gt; ?',
                    '{abc} {at} {space} {hide}'
                ]
            },
            display: {
                '{bksp}': '⌫',
                '{space}': ' ',
                '{hide}': ' ',
                '{ABC}': 'ABC',
                '{abc}': 'abc',
                '{at}': '@'
            },
            buttonTheme: [
                {
                    class: "key-top",
                    buttons: "` 1 2 3 4 5 6 7 8 9 0 - = ~ ! @ # $ % ^ &amp; * ( ) _ + {bksp}"
                },
                {
                    class: "key-bottom",
                    buttons: "{ABC} {abc} {at} {space} {hide}"
                },
                {
                    class: "key-hide",
                    buttons: "{hide}"
                },
            ],
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

    show() {
        // Determine whether to show the keyboard above or below the input
        const inputRect = this._input.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        if (inputRect.top > windowHeight / 2) {
            this._keyboardContainer.classList.add("top");
        } else {
            this._keyboardContainer.classList.remove("top");
        }

        // Make the keyboard visible
        this._hiding = false;
        this._keyboardContainer.style.display = "block";
        requestAnimationFrame(() => {
            this._keyboardContainer.classList.add("visible");
        });
    }   

    hide() {
        this._hiding = true;
        this._keyboardContainer.classList.remove("visible");
        setTimeout(() => {
            if (this._hiding) {
                this._keyboardContainer.style.display = "none";
            }
        }, 300); // Hide keyboard after removal with delay
    }

    private focusListener = (event: Event) => {
        console.log("Focus event", event);
        this._input = event.target as HTMLInputElement | HTMLTextAreaElement;

        if (this.keyboard) {
            this.keyboard.setInput(this._input.value);
        }

        this.show();
    };

    private blurListener = (event: Event) => {
        console.log("Blur event", event);
        if (event.target == this._input) {
            this.hide();
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
            this.hide();
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

        if (button === "{ABC}" || button === "{abc}") {
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

        this.show();
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

