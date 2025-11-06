import { TestScheduler } from "rxjs/testing";
import { expect } from "chai";
import { describe, it } from "mocha";

import { concat, filter, interval, map, of, retry, take, tap } from "rxjs";

/*
# RxJS Marble Testing

RxJS marble testing allows for a more natural style of testing observables.

Let's get started with the basics of marble testing!

## Marble Diagram Symbols

First, let's understand the pieces that make up a valid marble diagram.

| Symbol | Description | Example | Timeline Explanation |
|--------|-------------|---------|---------------------|
| `-` (Dash) | Indicates passing of time (each dash = 10ms in tests) | `-----` | 50ms |
| `a-z` (Characters) | Represents emitted values | `-----a-----b-----c` | Emit 'a' at 60ms, 'b' at 120ms, 'c' at 180ms |
| `\|` (Pipe) | Indicates observable completion | `-----a\|` | Emit 'a' at 60ms then complete (70ms) |
| `()` (Parentheses) | Multiple emissions in same time frame | `-----(abc\|)` | Emit 'a','b','c' at 60ms then complete (60ms) |
| `^` (Caret) | Subscription starting point | `^-------` | Subscription point at caret |
| `!` (Exclamation) | Subscription end point | `^------!` | Subscription starts at caret, ends at exclamation |
| `#` (Pound) | Indicates an error | `---a---#` | Emit 'a' at 40ms, error at 80ms |

## Marble Testing Methods

- [RunHelpers](https://rxjs.dev/api/testing/RunHelpers)
  Provides a set of helper functions to make testing possible 🫣


  | Helper  | Purpose & Key Details |
  |---------|-----------------------|
  | cold    | Creates a cold observable. Subscription triggers emissions; each subscriber gets its own stream . |
  | hot     | Creates a hot observable. Emits regardless of subscriptions; subscribers miss emissions before they subscribe . |
  | expectObservable  | Asserts that an Observable's emissions match an expected marble diagram. Use .toBe() for the expected sequence . |
  | expectSubscriptions | Asserts that an Observable's subscription/unscription timeline matches an expected pattern . |
  | flush | Manually executes all scheduled assertions immediately. Useful for testing side effects . |
  | time |  Parses a marble string into a number of virtual milliseconds (e.g., time('----') returns 4) . |
  | animate | Creates a visual representation of the test scheduler's virtual time for debugging . |


*/
describe("RxJS Marble Testing example", () => {
  /*
        Marble diagrams are parsed, creating an observable that emits test message objects.
        These include the values emitted, the frame at which they were emitted, and the type
        of notification, including next, error, and complete. This allows a deep equal to be run
        against the expected output, which is created in the same fashion by parsing the marble diagram
        supplied in the toBe clause.

        Example output:
        {"frame":30,"notification":{"kind":"N","value":"a","hasValue":true}}
        {"frame":70,"notification":{"kind":"N","value":"b","hasValue":true}}
        {"frame":110,"notification":{"kind":"C","hasValue":false}}
  */
  let testScheduler: TestScheduler;

  beforeEach(() => {
    /*
      It's important to reset the TestScheduler to reset the frame number

      The purpose of the callback is to tell TestScheduler how your test framework matches objects
      This example uses Chai,  adapting to other frameworks is left as an exercise to the reader 😉
      
    */
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).to.deep.equal(expected);
    });
  });

  /*
        Marble diagrams are parsed, creating an observable that emits test message objects.
        These include the values emitted, the frame at which they were emitted, and the type
        of notification, including next, error, and complete. This allows a deep equal to be run
        against the expected output, which is created in the same fashion by parsing the marble diagram
        supplied in the toBe clause.

        Example output:
        {"frame":30,"notification":{"kind":"N","value":"a","hasValue":true}}
        {"frame":70,"notification":{"kind":"N","value":"b","hasValue":true}}
        {"frame":110,"notification":{"kind":"C","hasValue":false}}
  */
  it("should parse marble diagrams", () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable } = helpers;

      const source = cold("---a---b---|");
      const expected = "---a---b---|";

      expectObservable(source.pipe(tap(console.log))).toBe(expected);
    });
  });

  /*
        When using cold observables you do not need to indicate a subscription point.
        The point of subscription is treated as the beginning of the test.
  */
  it("should work with cold observables", () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable } = helpers;
      const obs1 = cold("-a---b-|");
      const obs2 = cold("-c---d-|");
      const expected = "-a---b--c---d-|";

      expectObservable(concat(obs1, obs2)).toBe(expected);
    });
  });

  /*
        When testing hot observables you can specify the subscription
        point using a caret ^, similar to how you specify subscriptions
        when utilizing the expectSubscriptions assertion.
  */
  it("should work with hot observables", () => {
    testScheduler.run((helpers) => {
      const { hot, expectObservable } = helpers;
      const obs1 = hot("---a--^-b-|");
      const obs2 = hot("-----c^----d-|");
      const expected = "--b--d-|";

      expectObservable(concat(obs1, obs2)).toBe(expected);
    });
  });

  /*
        For certain operators you may want to confirm the point at which
        an observable is subscribed or unsubscribed. Marble testing makes this
        possible by using the expectSubscriptions helper method. The cold and hot
        methods return a subscriptions object, including the frame at which the observable
        would be subscribed and unsubscribed. You can then assert against these
        subscription points by supplying a diagram which indicates the expected behavior.

        ^ - Indicated the subscription point.
        ! - Indicates the point at which the observable was unsubscribed.

        Example subscriptions object: {"subscribedFrame":70,"unsubscribedFrame":140}
  */
  it("should identify subscription points", () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable, expectSubscriptions } = helpers;
      const obs1 = cold("-a---b-|");
      const obs2 = cold("-c---d-|");
      const expected = "-a---b--c---d-|";
      const sub1 = "^------!";
      const sub2 = "-------^------!";

      expectObservable(concat(obs1, obs2)).toBe(expected);
      expectSubscriptions(obs1.subscriptions).toBe(sub1);
      expectSubscriptions(obs2.subscriptions).toBe(sub2);
    });
  });

  /*
        Both the hot and cold methods, as well the toBe method accept an object map as a
        second parameter, indicating the values to output for the appropriate placeholder.
        When the test is executed these values rather than the matching string in the marble diagram.
  */
  it("should correctly sub in values", () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable } = helpers;
      const values = { a: 1, b: 2 };
      const source = cold("---a---b---|", values);
      const expected = "---a---b---|";

      expectObservable(source).toBe(expected, values);
    });
  });

  /*
        Multiple emissions occurring in same time frame can be represented by grouping in parentheses.
        Complete and error symbols can also be included in the same grouping as simulated outputs.
   */
  it("should handle emissions in same time frame", () => {
    testScheduler.run((helpers) => {
      const { expectObservable } = helpers;
      const obs1 = of(1, 2, 3);
      const expected = "(abc|)";

      expectObservable(obs1).toBe(expected, { a: 1, b: 2, c: 3 });
    });
  });

  /*
        For asynchronous tests RxJS supplies a TestScheduler.
        How it works...
  */
  it("should work with asynchronous operators", () => {
    testScheduler.run((helpers) => {
      const { expectObservable } = helpers;
      const obs = interval(1, testScheduler).pipe(
        take(5),
        filter((v) => v % 2 === 0),
      );

      const expected = "-a-b-(c|)";

      expectObservable(obs).toBe(expected, { a: 0, b: 2, c: 4 });
    });
  });

  /*
        Observables that encounter errors are represented by the pound (#) sign.
        In this case, our observable is retried twice before ultimately emitting an error.
        A third value can be supplied to the toBe method specifying the error to be matched.
  */
  it("should handle errors", () => {
    testScheduler.run((helpers) => {
      const { expectObservable } = helpers;
      const source = of(1, 2, 3).pipe(
        map((val) => {
          if (val > 2) {
            throw "Number too high!";
          }
          return val;
        }),
        retry(2),
      );

      const expected = "(ababab#)";

      expectObservable(source).toBe(
        expected,
        { a: 1, b: 2, c: 3 },
        "Number too high!",
      );
    });
  });
});
