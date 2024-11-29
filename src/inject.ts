import { customElement } from 'lit/decorators.js';
import Keyboard from 'simple-keyboard';
import styles from './simple-keyboard/build/css/index.css';
import keyboardStyles from './keyboard.css';

// Global keyboard instance
let globalKeyboard: VirtualKeyboard;

@customElement('virtual-keyboard')
class VirtualKeyboard extends HTMLElement {
    private _input: HTMLInputElement | HTMLTextAreaElement | null;
    private _keyboardContainer: HTMLElement | null;
    private _hasFocus: boolean = false;
    private _side: string = "bottom";
    private _type: string = "default";

    keyboard: Keyboard | null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <div class="simple-keyboard-outer">
                <div class="simple-keyboard">
                </div>
            </div>
        `;
        this._input = null;
        this._keyboardContainer = null;
    }

    connectedCallback() {
        this._keyboardContainer = this.shadowRoot.querySelector(".simple-keyboard-outer") as HTMLElement;
        const keyboardInternal = this.shadowRoot.querySelector(".simple-keyboard") as HTMLElement;

        this._keyboardContainer.style.position = 'fixed';
        this._keyboardContainer.style.zIndex = "1000";

        // Start initially hidden. A focus event will show the keyboard.
        this._keyboardContainer.style.display = "none";

        const style = document.createElement('style');
        style.textContent = `
            ${styles}
            ${keyboardStyles}
        `;
        this._keyboardContainer.appendChild(style);

        this.keyboard = new Keyboard(keyboardInternal);

        this.keyboard.setOptions({
            onChange: (i : string) => this.onChange(i),
            onKeyPress: (button : string) => this.onKeyPress(button),
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
                ],
                'numeric': [
                    '1 2 3',
                    '4 5 6',
                    '7 8 9',
                    '. 0 {bksp}'
                ]
            },
            display: {
                '{bksp}': '⌫',
                '{space}': ' ',
                '{hide}': ' ',
                '{ABC}': 'ABC',
                '{abc}': 'abc',
                '{at}': '@'
            }
            //debug: true
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

    private addRemoveClass(className: string, match: string) {
        if (className === match) {
            this._keyboardContainer.classList.add(className);
        } else {
            this._keyboardContainer.classList.remove(className);
        }
    }

    private setSide(side: string) {
        this._side = side;
        this._keyboardContainer.classList.remove("top", "bottom", "left", "right");
        this._keyboardContainer.classList.add(side);
    }

    private setType(type: string) {
        this._type = type;
        if (type === "numeric") {
            this.keyboard.setOptions({
                layoutName: 'numeric',
                buttonTheme: [
                    {
                        class: "key-top",
                        buttons: "1 2 3"
                    },
                    {
                        class: "key-bottom",
                        buttons: ". 0 {bksp}"
                    },
                ]
            });
        } else {
            this.keyboard.setOptions({
                layoutName: 'default',
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
                ]
            });
        }
    }

    private startShow(newSide: string, newType: string) {
        // Temporarily disable transitions
        this._keyboardContainer.classList.add("no-transition");

        // Move the keyboard to the new position
        this.setSide(newSide);
        this.setType(newType);

        // Force reflow to apply the new position
        this._keyboardContainer.offsetHeight;

        requestAnimationFrame(() => {
            // Re-enable transitions
            this._keyboardContainer.classList.remove("no-transition");

            if (this._hasFocus) {
                this._keyboardContainer.style.display = "block";
                requestAnimationFrame(() => {
                    this._keyboardContainer.classList.add("visible");
                });
            }
        });
    }

    show() {
        // Determine whether to show the keyboard above or below the input
        const inputRect = this._input.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        let newSide = this._side;
        let newType = this._type;

        if (this._input.type === "number") {
            newType = "numeric";
            // Place on right unless the control is actually covered by the keyboard
            newSide = (inputRect.right >= windowWidth - 250) ? "left" : "right";
        } else {
            newType = "default";
            newSide = (inputRect.top > windowHeight / 2) ? "top" : "bottom";
        }

        if (newSide !== this._side || newType !== this._type) {
            // Transition to hidden first, then set the new side and type
            this.hide();
            this._keyboardContainer.addEventListener('transitionend', () => {
                this.startShow(newSide, newType);
            }, { once: true });
        } else {
            // Make the keyboard visible immediately
            this.setSide(newSide);
            this.setType(newType);
            this._keyboardContainer.style.display = "block";
            requestAnimationFrame(() => {
                this._keyboardContainer.classList.add("visible");
            });
        }
    }

    hide() {
        this._keyboardContainer.classList.remove("visible");
        this._keyboardContainer.addEventListener('transitionend', this.onTransitionEnd);
    }

    private onTransitionEnd = () => {
        this._keyboardContainer.removeEventListener('transitionend', this.onTransitionEnd);
        if (!this._hasFocus) {
            this._keyboardContainer.style.display = "none";
        }
    }


    private focusListener = (event: Event) => {
        console.log("Focus event", event);
        this._input = event.target as HTMLInputElement | HTMLTextAreaElement;

        if (this.keyboard) {
            this.keyboard.setInput(this._input.value);
        }

        this._hasFocus = true;

        this.show();
    };

    private blurListener = (event: Event) => {
        console.log("Blur event", event);
        if (event.target == this._input) {
            this._hasFocus = false;
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
        //console.log("Button pressed", button);

        if (button === "{ABC}" || button === "{abc}") {
            this.handleShift();
        }

        if (button === "{hide}") {
            this.hide();
        }

        if (button === "{at}") {
            this.keyboard.handleButtonClicked("@");
        }
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

const supportedInputTypes : string = "textarea, input[type='text'], input[type='number'"

function setupKeyboard(node : Element) {
    const inputs = node.querySelectorAll(supportedInputTypes);
    inputs.forEach(input => {
        if (input.classList.contains("keyboard-enabled")) return;

        input.classList.add("keyboard-enabled");

        globalKeyboard.input = input as HTMLInputElement | HTMLTextAreaElement;
    });
};

function traverseShadowRoots(root: Element) {
    if (root.shadowRoot) {
        const inputs = root.shadowRoot.querySelectorAll(supportedInputTypes);
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
    const inputs = node.querySelectorAll(supportedInputTypes);
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

