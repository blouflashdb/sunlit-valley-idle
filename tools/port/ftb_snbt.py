"""Reads and writes the SNBT files of FTB Quests (config/ftbquests/quests) for the port scripts (#18).

Unlike snbt.py, values keep their exact text: a scalar is a Raw string such as '"minecraft:stone"', '1b' or
'-4.5d', so a file read and written again only changes where the port changed it. Compounds are dicts (key order
kept), lists are lists. write() uses the FTB Quests layout: tabs, one entry per line, no commas, a list holding one
compound as "[{ ... }]".
"""
import json
import re


class Raw(str):
    """A scalar exactly as written: a quoted string with its quotes, a number with its suffix, true/false."""

    @property
    def text(self):
        """The value of a quoted string."""
        return json.loads(self) if self.startswith('"') else str(self)


class TypedList(list):
    """A byte, int or long array ([B; ...], [I; ...], [L; ...]); prefix is "B;", "I;" or "L;"."""

    def __init__(self, prefix, items=()):
        super().__init__(items)
        self.prefix = prefix


def quote(value):
    return Raw(json.dumps(value, ensure_ascii=False))


_BARE = re.compile(r"[A-Za-z0-9._+\-:]+")
_KEY = re.compile(r"[A-Za-z0-9._+\-]+")


class _Reader:
    def __init__(self, text):
        self.text = text
        self.pos = 0

    def skip(self):
        while self.pos < len(self.text) and (self.text[self.pos].isspace() or self.text[self.pos] == ","):
            self.pos += 1

    def peek(self):
        self.skip()
        return self.text[self.pos] if self.pos < len(self.text) else ""

    def value(self):
        char = self.peek()
        if char == "{":
            return self.compound()
        if char == "[":
            return self.list()
        if char == '"':
            start = self.pos
            self.pos += 1
            while self.text[self.pos] != '"':
                self.pos += 2 if self.text[self.pos] == "\\" else 1
            self.pos += 1
            return Raw(self.text[start:self.pos])
        match = _BARE.match(self.text, self.pos)
        if not match:
            raise ValueError(f"unexpected {self.text[self.pos:self.pos + 20]!r} at {self.pos}")
        self.pos = match.end()
        return Raw(match.group(0))

    def key(self):
        if self.peek() == '"':
            return self.value().text
        match = _KEY.match(self.text, self.pos)
        self.pos = match.end()
        return match.group(0)

    def compound(self):
        self.pos += 1
        out = {}
        while self.peek() != "}":
            key = self.key()
            if self.peek() != ":":
                raise ValueError(f"expected ':' after {key!r} at {self.pos}")
            self.pos += 1
            out[key] = self.value()
        self.pos += 1
        return out

    def list(self):
        self.pos += 1
        out = []
        if re.match(r"[BIL];", self.text[self.pos:self.pos + 2]):
            out = TypedList(self.text[self.pos:self.pos + 2])
            self.pos += 2
        while self.peek() != "]":
            out.append(self.value())
        self.pos += 1
        return out


def read(text):
    return _Reader(text).value()


def _key(key):
    return key if re.fullmatch(r"[A-Za-z0-9._+\-]+", key) else json.dumps(key)


def _write(value, indent):
    pad = "\t" * indent
    if isinstance(value, dict):
        if not value:
            return "{ }"
        lines = [f"{pad}\t{_key(k)}: {_write(v, indent + 1)}" for k, v in value.items()]
        return "{\n" + "\n".join(lines) + f"\n{pad}}}"
    if isinstance(value, list):
        if not value:
            return "[ ]"
        if not any(isinstance(v, (dict, list)) for v in value):
            prefix = value.prefix if isinstance(value, TypedList) else ""
            if len(value) == 1 and not prefix:
                return f"[{value[0]}]"
            return f"[{prefix}\n" + "\n".join(f"{pad}\t{v}" for v in value) + f"\n{pad}]"
        if len(value) == 1 and isinstance(value[0], dict):
            return "[" + _write(value[0], indent) + "]"
        return "[\n" + "\n".join(f"{pad}\t{_write(v, indent + 1)}" for v in value) + f"\n{pad}]"
    return str(value)


def write(value):
    return _write(value, 0) + "\n"
