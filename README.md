# Simple Keyboard Plugin

This is a virtual keyboard plugin that provides an on-screen keyboard for user input.

The keyboard currently works for text and number input on dialogs but doesn't yet work with vaadin combo boxes directly on dashboards.

# Installing
To install the keyboard add the following to your configuration.yaml file and restart Home Assistant:

```yaml
frontend:
  extra_module_url:
    - /hacsfiles/ha-keyboard/keyboard.js