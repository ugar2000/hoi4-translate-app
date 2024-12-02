import {CaretPosition, CaretPositionOptions, LANGUAGE_CODES} from "@/types";

export function isLanguageCode(value: string): value is LANGUAGE_CODES {
    return Object.values(LANGUAGE_CODES).includes(value as LANGUAGE_CODES);
}

const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',

    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',

    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',

    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',

    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',

    'letterSpacing',
    'wordSpacing',

    'tabSize',
    'MozTabSize'

];

const isBrowser = (typeof window !== 'undefined');
const isFirefox = (isBrowser && window.mozInnerScreenX != null);

export function getCaretCoordinates(element: HTMLElement, position: number, options?: CaretPositionOptions): CaretPosition {
    if (!isBrowser) {
        throw new Error('textarea-caret-position#getCaretCoordinates should only be called in a browser');
    }

    var debug = options && options.debug || false;
    if (debug) {
        var el = document.querySelector('#input-textarea-caret-position-mirror-div');
        if (el) el.parentNode.removeChild(el);
    }

    var div = document.createElement('div');
    div.id = 'input-textarea-caret-position-mirror-div';
    document.body.appendChild(div);

    var style = div.style;
    var computed = window.getComputedStyle ? window.getComputedStyle(element) : element.currentStyle;  // currentStyle for IE < 9
    var isInput = element.nodeName === 'INPUT';

    style.whiteSpace = 'pre-wrap';
    if (!isInput)
        style.wordWrap = 'break-word';  // only for textarea-s

    style.position = 'absolute';
    if (!debug)
        style.visibility = 'hidden';

    properties.forEach(function (prop) {
        if (isInput && prop === 'lineHeight') {
            style.lineHeight = computed.height;
        } else {
            style[prop] = computed[prop];
        }
    });

    if (isFirefox) {
        if (element.scrollHeight > parseInt(computed.height))
            style.overflowY = 'scroll';
    } else {
        style.overflow = 'hidden';
    }

    div.textContent = element.value.substring(0, position);
    if (isInput)
        div.textContent = div.textContent.replace(/\s/g, '\u00a0');

    var span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);

    var coordinates = {
        top: span.offsetTop + parseInt(computed['borderTopWidth']),
        left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
        height: parseInt(computed['lineHeight'])
    };

    if (debug) {
        span.style.backgroundColor = '#aaa';
    } else {
        document.body.removeChild(div);
    }

    return coordinates;
}
