/**
 * Object for counting declared values
 */
export class Counter {
  key: string;
  value: number = 0;

  constructor(key: string) {
    this.key = key;
  }

  inc() {
    this.value++;
    return this.value;
  }

  dec() {
    this.value--;
    return this.value;
  }
}
