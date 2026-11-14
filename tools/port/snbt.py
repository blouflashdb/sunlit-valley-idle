"""A small SNBT (stringified NBT) reader for the port scripts (#5).

parse("{a:1b,b:\"x\",c:[1,2]}") -> {"a": 1, "b": "x", "c": [1, 2]}. Number suffixes (b, s, l, f, d) are dropped,
so the result is plain JSON data; 0b/1b stay ints.
"""
import re

_NUMBER = re.compile(r"[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?[bBsSlLfFdD]?$")
_BARE = re.compile(r"[A-Za-z0-9._+\-:]+")
_KEY = re.compile(r"[A-Za-z0-9._+\-]+")


class _Reader:
    def __init__(self, text):
        self.text = text
        self.pos = 0

    def skip(self):
        while self.pos < len(self.text) and self.text[self.pos].isspace():
            self.pos += 1

    def peek(self):
        self.skip()
        return self.text[self.pos] if self.pos < len(self.text) else ""

    def expect(self, char):
        if self.peek() != char:
            raise ValueError(f"expected {char!r} at {self.pos} in {self.text!r}")
        self.pos += 1

    def quoted(self):
        quote = self.text[self.pos]
        self.pos += 1
        out = []
        while True:
            char = self.text[self.pos]
            self.pos += 1
            if char == "\\":
                out.append(self.text[self.pos])
                self.pos += 1
            elif char == quote:
                return "".join(out)
            else:
                out.append(char)

    def key(self):
        if self.peek() in "\"'":
            return self.quoted()
        match = _KEY.match(self.text, self.pos)
        self.pos = match.end()
        return match.group(0)

    def value(self):
        char = self.peek()
        if char == "{":
            self.pos += 1
            out = {}
            while self.peek() != "}":
                key = self.key()
                self.expect(":")
                out[key] = self.value()
                if self.peek() == ",":
                    self.pos += 1
            self.pos += 1
            return out
        if char == "[":
            self.pos += 1
            if re.match(r"[BIL];", self.text[self.pos:self.pos + 2]):
                self.pos += 2
            out = []
            while self.peek() != "]":
                out.append(self.value())
                if self.peek() == ",":
                    self.pos += 1
            self.pos += 1
            return out
        if char in "\"'":
            return self.quoted()
        match = _BARE.match(self.text, self.pos)
        self.pos = match.end()
        word = match.group(0)
        if word == "true":
            return 1
        if word == "false":
            return 0
        if _NUMBER.match(word):
            number = word.rstrip("bBsSlLfFdD") if not word[-1].isdigit() else word
            if word[-1] in "fFdD" or "." in number or "e" in number.lower():
                return float(number)
            return int(number)
        return word


def parse(text):
    reader = _Reader(text)
    value = reader.value()
    if reader.peek():
        raise ValueError(f"trailing text at {reader.pos} in {text!r}")
    return value
