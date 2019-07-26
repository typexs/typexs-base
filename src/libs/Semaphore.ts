/**
 * https://gist.github.com/Gericop/e33be1f201cf242197d9c4d0a1fa7335
 */
export class Semaphore {

  /**
   * Count resource usage
   */
  private counter = 0;

  /**
   * Waiting queue
   */
  private waiting: { resolve: Function, err: Function }[] = [];

  private readonly max: number;

  constructor(max: number) {
    this.max = max;
  }

  /**
   * Take the next waiting caller
   */
  private take() {
    if (this.waiting.length > 0 && this.counter < this.max) {
      this.counter++;
      const promise = this.waiting.shift();
      promise.resolve();
    }
  }

  /**
   * Acquire semaphore for resource use
   */
  acquire() {
    if (this.counter < this.max) {
      this.counter++;
      return new Promise(resolve => {
        resolve();
      });
    } else {
      return new Promise((resolve, err) => {
        this.waiting.push({resolve: resolve, err: err});
      });
    }
  }

  /**
   * Release semaphore and free resource
   */
  release() {
    this.counter--;
    this.take();
  }

  /**
   * Purge acquired leases
   */
  purge() {
    const unresolved = this.waiting.length;

    for (let i = 0; i < unresolved; i++) {
      this.waiting[i].err('Task has been purged.');
    }

    this.counter = 0;
    this.waiting = [];

    return unresolved;
  }


}
