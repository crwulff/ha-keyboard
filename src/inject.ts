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
    private _currentSide: string = "none";
    private _currentType: string = "none";
    private _targetSide: string = "bottom";
    private _targetType: string = "default";

   /**
    * State machine for the keyboard visibility.
    *
    * digraph StateMachine {
    *   hidden -> moving;
    *   moving -> hidden;
    *   hidden -> showing;
    *   showing -> visible;
    *   visible -> hiding;
    *   hiding -> hidden;
    * }
    */
    private _state: 'moving' | 'hidden' | 'hiding' | 'showing' | 'visible' = 'hidden';

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

        // Add event listeners for transitionstart and transitionend
        this._keyboardContainer.addEventListener('transitionend', this.onTransitionEnd);

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

    private handleEvent(event: string) {
        console.log("Handling event", event, "in state", this._state);
        switch (event) {
            case 'transitionend':
                if (this._state === 'moving') {
                    this._state = 'hidden';
                } else if (this._state === 'hiding') {
                    this._state = 'hidden';
                } else if (this._state === 'showing') {
                    this._state = 'visible';
                }
                break;
            case 'postypechange':
            case 'hide':
                /* Nothing to do. State handling below will take care of the rest */
                break;
        }

        switch (this._state) {
            case 'visible':
                /* If we are on the wrong side or type, start by hiding the keyboard.
                 * If we no longer have focus, start hiding the keyboard.
                 */
                if (this._targetSide !== this._currentSide ||
                    this._targetType !== this._currentType ||
                    !this._hasFocus) {

                    this._state = 'hiding';
                    this.startHiding();
                }
                break;
            case 'hidden':
                /* If we are on the wrong side or type, start moving the keyboard */
                if (this._targetSide !== this._currentSide ||
                    this._targetType !== this._currentType) {

                    this._state = 'moving';
                    this.startMove(this._targetSide, this._targetType);
                }
                /* We are the correct side and type, but we are still hidden.
                 * Start showing the keyboard
                 */
                else if (this._hasFocus) {
                    this._state = 'showing';
                    this.startShowing();
                }
                break;
        }
    }

    private setSide(side: string) {
        this._currentSide = side;
        this._keyboardContainer.classList.remove("top", "bottom", "left", "right");
        this._keyboardContainer.classList.add(side);
    }

    private setType(type: string) {
        this._currentType = type;
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

    private startMove(newSide: string, newType: string) {
        console.log("Moving keyboard to", newSide, newType);
        // Temporarily disable transitions
        this._keyboardContainer.classList.add("no-transition");

        // Move the keyboard to the new position
        this.setSide(newSide);
        this.setType(newType);

        // Force reflow to apply the new position
        this._keyboardContainer.offsetHeight;

        requestAnimationFrame(() => {
            console.log("Transitioning keyboard to", newSide, newType);
            // Re-enable transitions
            this._keyboardContainer.classList.remove("no-transition");

            // The animation frame is immediately complete
            this.handleEvent('transitionend');
        });
    }

    private startShowing() {
        console.log("Showing keyboard");
        this._keyboardContainer.style.display = "block";
        requestAnimationFrame(() => {
            console.log("Starting transition to visible");
            this._keyboardContainer.classList.add("visible");
        });
    }

    private startHiding() {
        console.log("Hiding keyboard");
        requestAnimationFrame(() => {
            console.log("Starting transition to hidden");
            this._keyboardContainer.classList.remove("visible");
        });
    }

    show() {
        // Determine whether to show the keyboard above or below the input
        const inputRect = this._input.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        let newSide = this._currentSide;
        let newType = this._currentType;

        if (this._input.type === "number") {
            newType = "numeric";
            // Place on right unless the control is actually covered by the keyboard
            newSide = (inputRect.right >= windowWidth - 250) ? "left" : "right";
        } else {
            newType = "default";
            newSide = (inputRect.top > windowHeight / 2) ? "top" : "bottom";
        }

        this._targetSide = newSide;
        this._targetType = newType;
        setTimeout(() => {
            this.handleEvent('postypechange');
        }, 50);
    }

    hide() {
        setTimeout(() => {
            this.handleEvent('hide');
        }, 50);
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
            this._hasFocus = false;
            this.hide();
        }

        if (button === "{at}") {
            this.keyboard.handleButtonClicked("@");
        }
    }

    private onTransitionEnd = () => {
        console.log('Transition ended');
        this.handleEvent('transitionend');
    };

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

