// @flow

import type Parser from "../../parser";
import { types as tt } from "../../tokenizer/types";
import * as N from "../../types";
const htmlparser = require("htmlparser2");

export default (superClass: Class<Parser>): Class<Parser> =>
  class extends superClass {
    parseClassTag(classBody: N.ClassBody, member: N.ClassMember) {
      const [tagName, value] = this.readClassTag();
      const tag: N.ClassProperty = (member: any);

      const key = this.createIdentifier(this.startNode(), (tagName: any));
      tag.key = key;
      tag.computed = false;
      tag.static = true;
      tag.value = this.parseLiteral(value, "StringLiteral");
      (tag: any).tag = true;

      classBody.body.push(this.finishNode(tag, "ClassProperty"));
    }

    readClassTag() {
      let startTag = null;
      let startTagCount = 0;
      let finished = false;
      let valueStart = 0;
      const jsParser = this;

      const parser = new htmlparser.Parser({
        onopentag(name: string) {
          if (startTag === null) {
            startTag = name;
            startTagCount = 1;
            valueStart = jsParser.state.pos + 1;
          } else if (name === startTag) {
            startTagCount++;
          }
        },
        onclosetag(name) {
          if (name === startTag) {
            startTagCount--;
            if (startTagCount === 0) {
              finished = true;
            }
          }
        },
      });

      // Start from previous position so the HTML parser sees the opening `<`
      // character.
      --this.state.pos;
      for (;;) {
        if (this.state.pos >= this.state.length) {
          this.raise(this.state.start, "Unterminated class tag");
        }
        const ch = this.state.input.charAt(this.state.pos);
        parser.write(ch);
        if (finished) {
          break;
        } else {
          ++this.state.pos;
        }
      }

      // Subtract tag name + </ and > characaters.
      const valueEnd = this.state.pos - (startTag: any).length - 2;
      const value = this.state.input.slice(valueStart, valueEnd);
      this.nextToken();

      return [startTag, value];
    }

    // ==================================
    // Overrides
    // ==================================
    parseClassMember(
      classBody: N.ClassBody,
      member: N.ClassMember,
      state: { hadConstructor: boolean },
      constructorAllowsSuper: boolean,
    ): void {
      if (this.match(tt.relational) && this.state.value === "<") {
        this.parseClassTag(classBody, member);
      } else {
        super.parseClassMember(
          classBody,
          member,
          state,
          constructorAllowsSuper,
        );
      }
    }
    // getTokenFromCode(code: number): void {
    //   console.log("STATE:", this.state);

    //   if (code === charCodes.lessThan) {
    //     console.log('LESS THAN');
    //   }

    //   return super.getTokenFromCode(code);
    // }
  };
