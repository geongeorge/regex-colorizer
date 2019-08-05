/*! RegexColorizer v0.0.1
 * (c) 2010-2012 Steven Levithan <http://stevenlevithan.com/regex/colorizer/>
 * (c) 2019 Geon George <http://geongeorge.com/>
 * MIT license
 */

class RegexColorize {
    // "use strict";

    /*--------------------------------------
     *  Private variables
     *------------------------------------*/
    constructor(cls) {
        this.myclass = cls || "regex";
        this.regexToken = /\[\^?]?(?:[^\\\]]+|\\[\S\s]?)*]?|\\(?:0(?:[0-3][0-7]{0,2}|[4-7][0-7]?)?|[1-9][0-9]*|x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4}|c[A-Za-z]|[\S\s]?)|\((?:\?[:=!]?)?|(?:[?*+]|\{[0-9]+(?:,[0-9]*)?\})\??|[^.?*+^${[()|\\]+|./g;
        this.charClassToken = /[^\\-]+|-|\\(?:[0-3][0-7]{0,2}|[4-7][0-7]?|x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4}|c[A-Za-z]|[\S\s]?)/g;
        this.charClassParts = /^(\[\^?)(]?(?:[^\\\]]+|\\[\S\s]?)*)(]?)$/;
        this.quantifier = /^(?:[?*+]|\{[0-9]+(?:,[0-9]*)?\})\??$/;
        this.type = {
            NONE: 0,
            RANGE_HYPHEN: 1,
            SHORT_CLASS: 2,
            ALTERNATOR: 3
        };
        this.error = {
            UNCLOSED_CLASS: "Unclosed character class",
            INCOMPLETE_TOKEN: "Incomplete regex token",
            INVALID_RANGE: "Reversed or invalid range",
            INVALID_GROUP_TYPE: "Invalid or unsupported group type",
            UNBALANCED_LEFT_PAREN: "Unclosed grouping",
            UNBALANCED_RIGHT_PAREN: "No matching opening parenthesis",
            INTERVAL_OVERFLOW: "Interval quantifier cannot use value over 65,535",
            INTERVAL_REVERSED: "Interval quantifier range is reversed",
            UNQUANTIFIABLE: "Quantifiers must be preceded by a token that can be repeated",
            IMPROPER_EMPTY_ALTERNATIVE: "Empty alternative effectively truncates the regex here"
        };
    }
    // var self = {},


    /*--------------------------------------
     *  Private helper functions
     *------------------------------------*/

    /**
     * Returns HTML for error highlighting.
     * @private
     * @param {String} str Pattern to apply error highlighting to.
     * @param {String} [desc] Error description.
     * @returns {String} HTML for error highlighting.
     */
    errorize(str, desc) {
        return '<b class="err"' + (desc ? ' title="' + desc + '"' : '') + '>' + str + '</b>';
    }

    /**
     * Returns HTML for group highlighting.
     * @private
     * @param {String} str Pattern to apply group highlighting to.
     * @param {Number} depth Group nesting depth.
     * @returns {String} HTML for group highlighting.
     */
    groupize(str, depth) {
        return '<b class="g' + depth + '">' + str + '</b>';
    }

    /**
     * Expands &, <, and > characters in the provided string to HTML entities &amp;, &lt;, and &gt;.
     * @private
     * @param {String} str String with characters to expand.
     * @returns {String} String with characters expanded.
     */
    expandHtmlEntities(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    /**
     * Returns a set of elements within the page body that have the given class name.
     * @private
     * @param {String} cls Class name.
     * @returns {NodeList|HTMLCollection|Array} Set of elements.
     */

    elsByClass(cls) {
        if (document.getElementsByClassName) {
            return document.body.getElementsByClassName(cls);
        }
        var els = document.body.getElementsByTagName("*"),
            regex = new RegExp("(?:^|\\s)" + cls + "(?:\\s|$)"),
            result = [],
            len = els.length,
            i;
        for (i = 0; i < len; i++) {
            if (regex.test(els[i].className)) {
                result.push(els[i]);
            }
        }
        return result;
    }

    /**
     * Returns the character code for the provided regex token. Supports tokens used within character
     * classes only, since that's all it's currently needed for.
     * @private
     * @param {String} token Regex token.
     * @returns {Number} Character code of the provided token, or NaN.
     */
    getTokenCharCode(token) {
        // Escape sequence
        if (token.length > 1 && token.charAt(0) === "\\") {
            var t = token.slice(1);
            // Control character
            if (/^c[A-Za-z]$/.test(t)) {
                return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(t.charAt(1).toUpperCase()) + 1;
            }
            // Two or four digit hexadecimal character code
            if (/^(?:x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4})$/.test(t)) {
                return parseInt(t.slice(1), 16);
            }
            // One to three digit octal character code up to 377 (0xFF)
            if (/^(?:[0-3][0-7]{0,2}|[4-7][0-7]?)$/.test(t)) {
                return parseInt(t, 8);
            }
            // Shorthand class or incomplete token
            if (t.length === 1 && "cuxDdSsWw".indexOf(t) > -1) {
                return NaN;
            }
            // Metacharacter representing a single character index, or escaped literal character
            if (t.length === 1) {
                switch (t) {
                    case "b":
                        return 8; // Backspace
                    case "f":
                        return 12; // Form feed
                    case "n":
                        return 10; // Line feed
                    case "r":
                        return 13; // Carriage return
                    case "t":
                        return 9; // Horizontal tab
                    case "v":
                        return 11; // Vertical tab
                    default:
                        return t.charCodeAt(0); // Escaped literal character
                }
            }
        }
        // Unescaped literal token(s)
        if (token !== "\\") {
            return token.charCodeAt(0);
        }
        return NaN;
    }

    /**
     * Applies regex syntax highlighting to the provided character class. Character classes have their
     * own syntax rules which are different (sometimes quite subtly) from surrounding regex syntax.
     * Hence, they're treated as a single token and parsed separately.
     * @private
     * @param {String} value Character class pattern to be colorized.
     * @returns {String} HTML for displaying the character class with syntax highlighting.
     */
    parseCharClass(value) {
        var output = "",
            parts = this.charClassParts.exec(value),
            lastToken = {
                rangeable: false,
                type: this.type.NONE
            },
            match, m;
        parts = {
            opening: parts[1],
            content: parts[2],
            closing: parts[3]
        };

        output += parts.closing ? parts.opening : this.errorize(parts.opening, this.error.UNCLOSED_CLASS);

        // The charClassToken regex does most of the tokenization grunt work
        while (match = this.charClassToken.exec(parts.content)) {
            m = match[0];
            // Escape
            if (m.charAt(0) === "\\") {
                /* Inside character classes, browsers differ on how they handle the following:
                 * - Any representation of character index zero (\0, \00, \000, \x00, \u0000).
                 * - "\c", when not followed by A-Z or a-z.
                 * - "\x", when not followed by two hex characters.
                 * - "\u", when not followed by four hex characters.
                 * However, although representations of character index zero within character
                 * classes don't work on their own in Firefox, they don't throw an error, they work
                 * when used with ranges, and it's highly unlikely that the user will actually have
                 * such a character in their test data, so such tokens are highlighted normally.
                 * The remaining metasequences are flagged as errors.
                 */
                if (/^\\[cux]$/.test(m)) {
                    output += this.errorize(m, this.error.INCOMPLETE_TOKEN);
                    lastToken = {
                        rangeable: lastToken.type !== this.type.RANGE_HYPHEN
                    };
                    // Shorthand class (matches more than one character index)
                } else if (/^\\[dsw]$/i.test(m)) {
                    output += "<b>" + m + "</b>";
                    /* Traditional regex behavior is that a shorthand class should be unrangeable.
                     * Hence, [-\dz], [\d-z], and [z-\d] should all be equivalent. However, at
                     * least some browsers handle this inconsistently. E.g., Firefox 2 throws an
                     * invalid range error for [z-\d] and [\d--].
                     */
                    lastToken = {
                        rangeable: lastToken.type !== this.type.RANGE_HYPHEN,
                        type: this.type.SHORT_CLASS
                    };
                    // Unescaped "\" at the end of the regex
                } else if (m === "\\") {
                    output += this.errorize(m, this.error.INCOMPLETE_TOKEN);
                    // Don't need to set lastToken since this is the end of the line
                    // Metasequence representing a single character index, or escaped literal character
                } else {
                    output += "<b>" + this.expandHtmlEntities(m) + "</b>";
                    lastToken = {
                        rangeable: lastToken.type !== this.type.RANGE_HYPHEN,
                        charCode: this.getTokenCharCode(m)
                    };
                }
                // Hyphen (might indicate a range)
            } else if (m === "-") {
                if (lastToken.rangeable) {
                    // Save the regex's lastIndex so we can reset it after checking the next token
                    var lastIndex = this.charClassToken.lastIndex,
                        nextToken = this.charClassToken.exec(parts.content);

                    if (nextToken) {
                        var nextTokenCharCode = this.getTokenCharCode(nextToken[0]);
                        // Hypen for a reverse range (e.g., z-a) or shorthand class (e.g., \d-x or x-\S)
                        if (
                            (!isNaN(nextTokenCharCode) && lastToken.charCode > nextTokenCharCode) ||
                            lastToken.type === this.type.SHORT_CLASS ||
                            /^\\[dsw]$/i.test(nextToken[0])
                        ) {
                            output += this.errorize("-", this.error.INVALID_RANGE);
                            // Hyphen creating a valid range
                        } else {
                            output += "<u>-</u>";
                        }
                        lastToken = {
                            rangeable: false,
                            type: this.type.RANGE_HYPHEN
                        };
                    } else {
                        // Hyphen at the end of a properly closed character class (literal character)
                        if (parts.closing) {
                            output += "-"; // Since this is a literal, it's technically "rangeable", but that doesn't matter
                            // Hyphen at the end of an unclosed character class (i.e., the end of the regex)
                        } else {
                            output += "<u>-</u>";
                        }
                    }

                    // Reset the regex's lastIndex so the next while loop iteration will continue appropriately
                    this.charClassToken.lastIndex = lastIndex;
                    // Hyphen at the beginning of a character class or after a non-rangeable token
                } else {
                    output += "-";
                    lastToken = {
                        rangeable: lastToken.type !== this.type.RANGE_HYPHEN
                    };
                }
                // Literal character sequence
            } else {
                output += this.expandHtmlEntities(m);
                lastToken = {
                    rangeable: (m.length > 1 || lastToken.type !== this.type.RANGE_HYPHEN),
                    charCode: m.charCodeAt(m.length - 1)
                };
            }
        } // End charClassToken loop

        return output + parts.closing;
    }

    /*--------------------------------------
     *  Public methods
     *------------------------------------*/

    /**
     * Applies regex syntax highlighting to the provided regex pattern string.
     * @memberOf RegexColorizer
     * @param {String} pattern Regex pattern to be colorized.
     * @returns {String} HTML for displaying the regex with syntax highlighting.
     * @example
     *
     * RegexColorizer.colorizeText('^regexp? pattern$');
     */
    colorizeText(pattern) {
        var output = "",
            capturingGroupCount = 0,
            groupStyleDepth = 0,
            openGroups = [],
            lastToken = {
                quantifiable: false,
                type: this.type.NONE
            },
            match, m, char0, char1;

        while (match = this.regexToken.exec(pattern)) {
            m = match[0];
            char0 = m.charAt(0);
            char1 = m.charAt(1);
            // Character class
            if (char0 === "[") {
                output += "<i>" + this.parseCharClass(m) + "</i>";
                lastToken = {
                    quantifiable: true
                };
                // Group opening
            } else if (char0 === "(") {
                // If this is an invalid group type, mark the error and don't count it towards
                // group depth or total count
                if (m.length === 2) { // m is "(?"
                    output += this.errorize(m, this.error.INVALID_GROUP_TYPE);
                } else {
                    if (m.length === 1) {
                        capturingGroupCount++;
                    }
                    groupStyleDepth = groupStyleDepth === 5 ? 1 : groupStyleDepth + 1;
                    /* Record the group opening's position and character sequence so we can later
                     * mark it as invalid if it turns out to be unclosed in the remainder of the
                     * regex. The value of index is the position plus the length of the opening <b>
                     * element with group-depth class.
                     */
                    openGroups.push({
                        index: output.length + '<b class="gN">'.length,
                        opening: m
                    });
                    // Add markup to the group-opening character sequence
                    output += this.groupize(m, groupStyleDepth);
                }
                lastToken = {
                    quantifiable: false
                };
                // Group closing
            } else if (char0 === ")") {
                // If this is an invalid group closing
                if (!openGroups.length) {
                    output += this.errorize(")", this.error.UNBALANCED_RIGHT_PAREN);
                    lastToken = {
                        quantifiable: false
                    };
                } else {
                    output += this.groupize(")", groupStyleDepth);
                    /* Although at least in some browsers it is possible to quantify lookaheads,
                     * this adds no value, doesn't work as you'd expect in JavaScript, and is an
                     * error with some regex flavors such as PCRE (also ES5?), so flag them as
                     * unquantifiable.
                     */
                    lastToken = {
                        quantifiable: !/^[=!]/.test(openGroups[openGroups.length - 1].opening.charAt(2)),
                        style: "g" + groupStyleDepth
                    };
                    groupStyleDepth = groupStyleDepth === 1 ? 5 : groupStyleDepth - 1;
                    // Drop the last opening paren from depth tracking
                    openGroups.pop();
                }
                // Escape or backreference
            } else if (char0 === "\\") {
                // Backreference or octal character code without a leading zero
                if (/^[1-9]/.test(char1)) {
                    /* What does "\10" mean?
                     * - Backref 10, if 10 or more capturing groups opened before this point.
                     * - Backref 1 followed by "0", if 1-9 capturing groups opened before this point.
                     * - Otherwise, it's octal character index 10 (since 10 is in octal range 0-377).
                     * In the case of \8 or \9 when as many capturing groups weren't opened before
                     * this point, they're highlighted as special tokens. However, they should
                     * probably be marked as errors since the handling is browser-specific. E.g.,
                     * in Firefox 2 they seem to be equivalent to "(?!)", while in IE 7 they match
                     * the literal characters "8" and "9", which is correct handling. I don't mark
                     * them as errors because it would seem inconsistent to users who don't
                     * understand the highlighting rules for octals, etc. In fact, octals are not
                     * included in ECMA-262v3, but all the big browsers support them.
                     */
                    var nonBackrefDigits = "",
                        num = +m.slice(1);
                    while (num > capturingGroupCount) {
                        nonBackrefDigits = /[0-9]$/.exec(num)[0] + nonBackrefDigits;
                        num = Math.floor(num / 10); // Drop the last digit
                    }
                    if (num > 0) {
                        output += "<b>\\" + num + "</b>" + nonBackrefDigits;
                    } else {
                        var parts = /^\\([0-3][0-7]{0,2}|[4-7][0-7]?|[89])([0-9]*)/.exec(m);
                        output += "<b>\\" + parts[1] + "</b>" + parts[2];
                    }
                    lastToken = {
                        quantifiable: true
                    };
                    // Metasequence
                } else if (/^[0bBcdDfnrsStuvwWx]/.test(char1)) {
                    /* Browsers differ on how they handle:
                     * - "\c", when not followed by A-Z or a-z.
                     * - "\x", when not followed by two hex characters.
                     * - "\u", when not followed by four hex characters.
                     * Hence, such metasequences are flagged as errors.
                     */
                    if (/^\\[cux]$/.test(m)) {
                        output += this.errorize(m, this.error.INCOMPLETE_TOKEN);
                        lastToken = {
                            quantifiable: false
                        };
                        // Unquantifiable metasequence
                    } else if ("bB".indexOf(char1) > -1) {
                        output += "<b>" + m + "</b>";
                        lastToken = {
                            quantifiable: false
                        };
                        // Quantifiable metasequence
                    } else {
                        output += "<b>" + m + "</b>";
                        lastToken = {
                            quantifiable: true
                        };
                    }
                    // Unescaped "\" at the end of the regex
                } else if (m === "\\") {
                    output += this.errorize(m, this.error.INCOMPLETE_TOKEN);
                    // Don't need to set lastToken since this is the end of the line
                    // Escaped literal character
                } else {
                    output += this.expandHtmlEntities(m);
                    lastToken = {
                        quantifiable: true
                    };
                }
                // Quantifier
            } else if (this.quantifier.test(m)) {
                if (lastToken.quantifiable) {
                    var interval = /^\{([0-9]+)(?:,([0-9]*))?/.exec(m);
                    // Interval quantifier out of range for Firefox
                    if (interval && (+interval[1] > 65535 || (interval[2] && +interval[2] > 65535))) {
                        output += this.errorize(m, this.error.INTERVAL_OVERFLOW);
                        // Interval quantifier in reverse numeric order
                    } else if (interval && interval[2] && (+interval[1] > +interval[2])) {
                        output += this.errorize(m, this.error.INTERVAL_REVERSED);
                    } else {
                        // Quantifiers for groups are shown in the style of the (preceeding) group's depth
                        output += (lastToken.style ? '<b class="' + lastToken.style + '">' : '<b>') + m + '</b>';
                    }
                } else {
                    output += this.errorize(m, this.error.UNQUANTIFIABLE);
                }
                lastToken = {
                    quantifiable: false
                };
                // Vertical bar (alternator)
            } else if (m === "|") {
                /* If there is a vertical bar at the very start of the regex, flag it as an error
                 * since it effectively truncates the regex at that point. If two top-level
                 * vertical bars are next to each other, flag it as an error for similar reasons.
                 */
                if (lastToken.type === this.type.NONE || (lastToken.type === this.type.ALTERNATOR && !openGroups.length)) {
                    output += this.errorize(m, this.error.IMPROPER_EMPTY_ALTERNATIVE);
                } else {
                    // Alternators within groups are shown in the style of the containing group's depth
                    output += openGroups.length ? this.groupize("|", groupStyleDepth) : "<b>|</b>";
                }
                lastToken = {
                    quantifiable: false,
                    type: this.type.ALTERNATOR
                };
                // ^ or $ anchor
            } else if (m === "^" || m === "$") {
                output += "<b>" + m + "</b>";
                lastToken = {
                    quantifiable: false
                };
                // Dot (.)
            } else if (m === ".") {
                output += "<b>.</b>";
                lastToken = {
                    quantifiable: true
                };
                // Literal character sequence
            } else {
                output += this.expandHtmlEntities(m);
                lastToken = {
                    quantifiable: true
                };
            }
        } // End regexToken loop

        // Mark the opening character sequence for each unclosed grouping as invalid
        var numCharsAdded = 0,
            errorIndex, i;
        for (i = 0; i < openGroups.length; i++) {
            errorIndex = openGroups[i].index + numCharsAdded;
            output = (
                output.slice(0, errorIndex) +
                this.errorize(openGroups[i].opening, this.error.UNBALANCED_LEFT_PAREN) +
                output.slice(errorIndex + openGroups[i].opening.length)
            );
            numCharsAdded += this.errorize("", this.error.UNBALANCED_LEFT_PAREN).length;
        }

        return output;
    };

    /**
     * Applies regex syntax highlighting to all elements on the page with the specified class.
     * @memberOf RegexColorizer
     * @param {String} [cls='regex'] Class name used by elements to be colorized.
     * @example
     *
     * // Basic use
     * RegexColorizer.colorizeAll();
     *
     * // With class name
     * RegexColorizer.colorizeAll('my-class');
     */
    colorizeAll() {
        var els = this.elsByClass(this.myclass),
            len = els.length,
            el, i;
        for (i = 0; i < len; i++) {
            el = els[i];
            el.innerHTML = this.colorizeText(el.textContent || el.innerText);
        }
    };

    /**
     * Adds a stylesheet with the default regex highlighting styles to the page. If you provide your
     * own stylesheet, you don't need to run this.
     * @memberOf RegexColorizer
     * @example
     *
     * RegexColorizer.addStyleSheet();
     */
    addStyleSheet = function () {
        var ss = document.createElement("style"),
            rules =
            ".regex       {font-family: Monospace;} " +
            ".regex b     {background: #aad1f7;} " + // metasequence
            ".regex i     {background: #e3e3e3;} " + // char class
            ".regex i b   {background: #9fb6dc;} " + // char class: metasequence
            ".regex i u   {background: #c3c3c3;} " + // char class: range-hyphen
            ".regex b.g1  {background: #b4fa50; color: #000;} " + // group: depth 1
            ".regex b.g2  {background: #8cd400; color: #000;} " + // group: depth 2
            ".regex b.g3  {background: #26b809; color: #fff;} " + // group: depth 3
            ".regex b.g4  {background: #30ea60; color: #000;} " + // group: depth 4
            ".regex b.g5  {background: #0c8d15; color: #fff;} " + // group: depth 5
            ".regex b.err {background: #e30000; color: #fff;} " + // error
            ".regex b, .regex i, .regex u {font-weight: normal; font-style: normal; text-decoration: none;}";
        ss.id = "regex-colorizer-ss";
        // Need to add to the DOM before setting cssText for IE < 9
        document.getElementsByTagName("head")[0].appendChild(ss);
        // Can't use innerHTML or innerText for stylesheets in IE < 9
        if (ss.styleSheet) {
            ss.styleSheet.cssText = rules;
        } else {
            ss.innerHTML = rules;
        }
    };

}

export default RegexColorize;