'use strict'
{
  let formData = new FormData();
  let data = {
    a1: 'a1_value',
    a2: 'a2_value',
    a3: 'a3_value',
    a4: 'a4_value',
    file: new File([0], 'name')
  }
  Object.entries(data).forEach(params => formData.append(...params))

  const R = {
    calc(str0 = 1, str1, rule) {
      let min, max;
      if (str1 === undefined) {
        min = 0
        max = str0
      } else {
        min = str0
        max = str1
      }
      return rule(Math.random() * (max - min) + min)
    },
    int(str0 = 1, str1) { // 返回str0 到 str1 间的整数（包含str0，str1自身）
      return this.calc(str0, str1 + 1, parseInt)
    },
    float(str0 = 1, str1) {
      return this.calc(str0, str1, parseFloat)
    }
  }
  const D = (selectorStr = 'div', inner) => {
    let element = {
      id: '',
      tagName: '',
      classList: [],
      node: null
    };

    selectorStr.replace(/[.#]?[^\.^#]+/g, (selStr) => {
      if (/^\./.test(selStr)) {
        element.classList.push(selStr.substr(1))
      } else if (/^\#/.test(selStr)) {
        if (element.id) {
          console.error('#只期望有以一个哟')
        } else {
          element.id = selStr.substr(1)
        }
      } else {
        element.tagName = selStr
      }
    });

    element.node = document.createElement(element.tagName);
    element.node.setAttribute('id', element.id);
    element.classList.forEach(className => element.node.classList.add(className));
    if (inner instanceof Element) {
      element.node.appendChild(inner)
    } else if (typeof inner === 'string') {
      element.node.innerHTML = innerHTML
    }
    Object.defineProperty(element.node, 'D', {
      get() {
        return (selectorStr0, inner0) => {
          let reDom = D(selectorStr0, inner0)
          element.node.appendChild(reDom)
          return reDom
        }
      }
    })
    return element.node
  }
  const consoleTabel = (array) => {
    if (!(array instanceof Array)) {
      return consoleTabel([array])
    }
    const STYLE_CONFIG = {
      BORDER_COLOR: '#FFFFFF',
      COLOR: '#409EFF',
      PADDING: '7px 10px',
      LABEL_COLOR: '#505050',
      LABEL_BACKGROUND: '#d2d2d2',
      BACKGROUND: ['#f5f5f5', '#e5e5e5']
    }
    const STYLE_CELL_LIST = `color: ${STYLE_CONFIG.COLOR}; padding: ${STYLE_CONFIG.PADDING}; border-bottom: 1px solid ${STYLE_CONFIG.BORDER_COLOR};`
    const STYLE_CELL_LABEL = [
      `font-weight: 800;`,
      `padding: ${STYLE_CONFIG.PADDING};`,
      `color: ${STYLE_CONFIG.LABEL_COLOR};`,
      `background-color: ${STYLE_CONFIG.LABEL_BACKGROUND};`,
      `border-bottom: 1px solid ${STYLE_CONFIG.BORDER_COLOR};`,
    ].join(' ')
    const STYLE_LIST = [
      `background-color: ${STYLE_CONFIG.BACKGROUND[0]}; ${STYLE_CELL_LIST}`,
      `background-color: ${STYLE_CONFIG.BACKGROUND[1]}; ${STYLE_CELL_LIST}`
    ]
    const STYLE_CELL = `border-right: 1px solid ${STYLE_CONFIG.BORDER_COLOR};`
    let styles = [];
    let table = array.map(i => i && i.map && i.map(ii => ii) || [i]);
    table = table.map((i = [], iNo) => [iNo, ...i])
    table.unshift(table[0] && table[0].map((i, iNo) => iNo - 1) || [0])
    table[0][0] = 'col \\ row';
    return console.log(
      table.map((i, index) => {
        let LAST_ROW_INDEX = i.length - 1;
        return i.map((iStr, sIndex) => {
          if (iStr === undefined) {
            iStr = 'undefined'
          } else if (iStr === null) {
            iStr = 'null'
          } else if (iStr && !iStr.toString) {
            iStr = 'undefined'
          }
          let styleStrArr = [];
          if (index === 0 || sIndex === 0) {
            styleStrArr[0] = STYLE_CELL_LABEL
          } else {
            styleStrArr[0] = STYLE_LIST[index % 2]
          }

          if (sIndex !== LAST_ROW_INDEX) {
            styleStrArr[0] += STYLE_CELL
          } else {
            styleStrArr.push('')
          }
          styles.push(...styleStrArr)
          return '%c' + iStr.toString().padEnd(10, ' ')
        }).join('')
      }).join('%c\n') + '%c',
      ...styles
    )
  }
  class Game2048 {
    DEFAULT_CONFIG = {
      mapSize: 4,
      autoAdd: true,
      historyLength: 30,
      initCellCount: 4,
      fadeDuration: 100,
      animateDuration: 300,
    }
    DIRECTION = [null, 'TOP', 'RIGHT', 'BOTTOM', 'LEFT'];
    RE_DIRECTION = [null, 'BOTTOM', 'LEFT', 'TOP', 'RIGHT'];
    constructor(el) {
      if (el instanceof Element) {
        this.container = el
      } else {
        this.container = document.querySelector(el)
      }
      for (let k = 0; k < this.DEFAULT_CONFIG.mapSize ** 2; k++) {
        this.container.appendChild(D('span.cell-wrap', D('span.cell-box')))
      }
      this.container.style.transitionDuration = this.DEFAULT_CONFIG.animateDuration + 'ms';
      this.proxy = [
        ['isOnError', this.container, 'class', v => v ? 'is-on-error' : ''],
      ].reduce((cell, bindParams) => new BindDom(cell, ...bindParams), this)
      this.initControler();
      this.initBtn()
      setTimeout(() => {
        this.init()
        document.querySelector('.is-not-ready').classList.remove('is-not-ready')
      }, 100);
      return this
    }
    isOnError = false;
    animate = new Proxy([], {
      set(target, key, value, self) {
        if (+key > -1 && (+key === 0 || target.isAutoPlay)) {
          let promiseNext = value();
          target.isAutoPlay = false;
          promiseNext.then && promiseNext.then(() => {
            target.isAutoPlay = true;
            self.shift()
          })
        }
        return Reflect.set(target, key, value);
      }
    })
    cellMap = {
      value: [],
      add: (value) => {
        this.cellMap.value.push(value)
      },
      remove: (tar) => {
        let index = this.cellMap.value.findIndex(c => {
          return c === tar
        })
        this.cellMap.value.splice(index, 1)
      },
      get: (x, y, isOnMoving) => {
        let coorKey = isOnMoving ? 'nextCoor' : 'coor';
        return this.cellMap.value.find(c => c[coorKey] && c[coorKey][0] === x && c[coorKey][1] === y);
      },
      log: () => {
        let table = Array.from({ length: this.DEFAULT_CONFIG.mapSize });
        table = table.map(() => Array.from({ length: this.DEFAULT_CONFIG.mapSize }).fill(''))
        this.cellMap.value.forEach((c) => {
          let [x, y] = c.coor;
          table[y][x] = c && c.level || '';
        })
        consoleTabel(table)
      },
      list: (isRise = true) => Array.from(this.cellMap.value.filter(i => i.level !== 0)).sort((a, b) => {
        let [aX, aY] = a.coor;
        let [bX, bY] = b.coor;
        let re = (aY === bY ? aX - bX : aY - bY) || 0;
        return isRise ? re : re * -1;
      })

    }
    history = {
      value: [],
      set: (directionFlag) => {
        this.history.value.unshift(this.history.calc(directionFlag));
        if (this.history.value[this.DEFAULT_CONFIG.historyLength + 1]) {
          this.history.value.pop()
        }
        this.history.refresh();
      },
      calc: (directionFlag, list = this.cellMap.value) => {
        let listMap = Array.from(list).map(c => {
          let { isNew, levelUp } = c.historyStatus;
          let status;
          if (isNew) {
            status = 1;
          } else if (levelUp) {
            status = 2;
          } else {
            status = 0;
          }
          let [x, y] = c.coor
          return [x, y, c.level, status]
        }).sort(([x1, y1], [x2, y2]) => {
          return y1 === y2 ? x1 - x2 : y1 - y2
        });
        listMap.unshift(directionFlag);
        return listMap
      },
      init: () => {
        let history = window.localStorage.getItem('history');
        if (history) {
          try {
            history = JSON.parse(history);
          } catch (error) {
            return
          }
        }
        if (history && history[0] && history[0][0] !== 0) {
          return history
        } else {
          return undefined
        }
      },
      reset: () => {
        this.proxy.history.value = [];
        window.localStorage.removeItem('history');
      },
      refresh: () => {
        window.localStorage.setItem('history', JSON.stringify(this.history.value))
      }
    }
    init(prop) {
      let count, getCoor, hasHistory = false;
      let history = this.history.init();
      this.cellMap.value.forEach(i => i.remove(true));
      this.cellMap.value = [];
      if (prop instanceof Array) {
        count = prop.length;
        getCoor = (index) => prop[index];
      } else if (prop === undefined && history) {
        hasHistory = true;
        let mapData = history[0].filter((i, iNo) => iNo > 0)
          .map(([x, y, l]) => [x, y, l]);
        count = mapData.length;
        getCoor = (i) => mapData[i];
        this.history.value.splice(0, this.history.value.length, ...history)
      } else {
        count = prop || this.DEFAULT_CONFIG.initCellCount;
        getCoor = () => this.randomEmtyCoor()
      }
      for (let k = 0; k < count; k++) {
        new Cell(getCoor(k), this)
      }
      this.cellMap.log()
      !hasHistory && this.history.set(0)
      return this
    }
    initBtn(unmakeEl = '#unmake', remakeEl = '#remake') {
      let uBtn = document.querySelector(unmakeEl)
      uBtn && uBtn.addEventListener('click', () => {
        this.unmake()
      })
      this.history.value = new BindDom(this.history.value, 'length', uBtn, 'class', (v) => v < 2 ? 'hide' : 'show');
      this.history.value = new BindDom(this.history.value, 'length', uBtn, 'innerHTML', (v) => `Re.Back(${v - 1})`);
      let mBtn = document.querySelector(remakeEl)
      mBtn && mBtn.addEventListener('click', () => {
        this.remake()
      })
      this.proxy = new BindDom(this.proxy, 'maxLevel', mBtn, 'class', (v) => `lv_${v}`)
    }
    initControler() {
      let el = this.container;
      if (!el) { return }
      let opts = {
        moveFlag: false,
        startSet: {},
        threshold: 40
      };
      this._touchInfo = opts
      el.addEventListener("mousedown", (e) => {
        Object.assign(this._touchInfo, {
          moveFlag: true,
          startSet: { x: e.clientX, y: e.clientY }
        })
      }, false);
      el.addEventListener("mousemove", this.moveEvent.bind(this), false);
      el.addEventListener("mouseup", () => {
        this._touchInfo.moveFlag = false;
      }, false);
      el.addEventListener("touchstart", ({ touches: [e] }) => {
        Object.assign(this._touchInfo, {
          moveFlag: true,
          startSet: { x: e.clientX, y: e.clientY }
        })
      }, false);
      el.addEventListener("touchmove", (e) => {
        this.moveEvent(e.touches[0])
        e.preventDefault();
      }, false);
      el.addEventListener("touchup", () => {
        this._touchInfo.moveFlag = false;
      }, false);
    }
    moveEvent(e) {
      if (this._touchInfo.moveFlag) {
        let { clientX: x, clientY: y } = e;
        x = this._touchInfo.startSet.x - x;
        y = this._touchInfo.startSet.y - y;
        if (Math.abs(x) > this._touchInfo.threshold || Math.abs(y) > this._touchInfo.threshold) {
          if (Math.abs(x) > Math.abs(y)) {
            if (x > 0) {
              this.move(4);
            } else {
              this.move(2)
            }
          } else {
            if (y > 0) {
              this.move(1)
            } else {
              this.move(3)
            }
          }
          this._touchInfo.moveFlag = false;
        }
      }
    }
    randomEmtyCoor(prefer) {
      prefer = this.DIRECTION[prefer] || prefer
      let getX, getY, mValue = Math.ceil(this.DEFAULT_CONFIG.mapSize / 2);
      let fnDown = v => (v > mValue) ? 0 : mValue - v, // 0 => 2, 2 => 1, 3 => 2
        fnUp = v => (v < mValue) ? 0 : v - mValue + 1;   // 0 => 0, 2 => 1, 3 => 2
      switch (prefer) {
        case 'TOP':
          getY = fnDown;
          break;
        case 'RIGHT':
          getX = fnUp;
          break;
        case 'BOTTOM':
          getY = fnUp;
          break;
        case 'LEFT':
          getX = fnDown;
          break;
        default:
          getY = getY = () => 1;
          ;
          break;
      }
      getX = getX || (() => 0);
      getY = getY || (() => 0);
      let weightMap = [];
      let weightCount = 0;
      // 遍历权重地图
      for (let x = 0; x < this.DEFAULT_CONFIG.mapSize; x++) {
        for (let y = 0; y < this.DEFAULT_CONFIG.mapSize; y++) {
          let cell = this.cellMap.get(x, y);
          if (cell !== undefined) {
            continue
          } else {
            let value = getX(x) + getY(y);
            weightCount += value;
            weightMap.push({ value, x, y })
          }
        }
      }
      // 随机权重取值
      weightCount = R.int(0, weightCount);
      let { x, y } = weightMap.find(i => {
        weightCount -= i.value
        return weightCount <= 0 && i.value;
      }) || weightMap[R.int(0, weightMap.length - 1)] || {};
      if (x === undefined && y === undefined) {
        console.warn('没地方', weightMap)
      }
      return [x, y]
    }
    move(direction, moveStatus, lastMovement) {
      if(this.banFinishNow){
        return this
      }
      if (lastMovement instanceof Array) {
        this.banFinishNow = true
        lastMovement = JSON.parse(JSON.stringify(lastMovement));
      }
      if (this.animate[0]) {
        this.finishNow();
        setTimeout(() => {
          this.move(direction, moveStatus, lastMovement)
        }, 30);
        return
      }
      this.animate.push(() => {
        direction = this.DIRECTION[direction] || direction;
        let allMovementPromse = []
        if (!direction) {
          return console.warn('移动至少有个方向吧')
        }
        // 右、下 移动需要倒序遍历 默认是正序
        let isRise, list;
        let nextStep;
        let transformStrArr = [];
        switch (direction) {
          case 'TOP':
            nextStep = ([x, y]) => [x, y - 1];
            transformStrArr.push((v) => `translateY(-${v}00%)`);
            break;
          case 'RIGHT':
            isRise = false;
            nextStep = ([x, y]) => [x + 1, y];
            transformStrArr.push((v) => `translateX(${v}00%)`);
            break;
          case 'BOTTOM':
            isRise = false;
            nextStep = ([x, y]) => [x, y + 1];
            transformStrArr.push((v) => `translateY(${v}00%)`);
            break;
          case 'LEFT':
            nextStep = ([x, y]) => [x - 1, y];
            transformStrArr.push((v) => `translateX(${-v}00%)`);
            break;
          default:
            break;
        }
        list = this.cellMap.list(isRise);
        if (moveStatus) {
          moveStatus.map(([x, y, level, status]) => {
            let trgCell = this.cellMap.get(x, y);
            trgCell.isOnDivide = status === 2;
            trgCell.isOnDestroy = status === 1;
            return trgCell
          })
        }
        let isMoved = false;
        if (list && list[0]) {
          let zIndexCount = 1000 + list.length;
          list.forEach(cell => {
            cell.zIndex = zIndexCount--;
            let coor = cell.coor;
            let moved = 0;
            let moveableCoorParams = [];
            while (moved < this.DEFAULT_CONFIG.mapSize + 1) {
              moved++
              if (cell.isOnDestroy) {
                cell.animate.push(['DESTROY', true])
                break
              }
              let nextCoor = nextStep(coor);
              let isOutOfRange = nextCoor.findIndex(v => v >= this.DEFAULT_CONFIG.mapSize || v < 0) !== -1;
              if (lastMovement) {
                let movementIndex = lastMovement.findIndex(([xl, yl]) => xl === coor[0] && yl === coor[1]);
                if (movementIndex !== -1) {
                  moveableCoorParams.push([movementIndex, moved]);
                }
              } else {
                if (isOutOfRange) {
                  if (moved > 1) {
                    cell.nextCoor = coor;
                    cell.animate.push(['MOVE_TO', coor, transformStrArr.map(i => moved - 1 ? i(moved - 1) : undefined)]);
                  }
                  break
                }
                let cellUnder = this.cellMap.get(...nextCoor, true);
                if (cellUnder) {
                  if (cellUnder.level === cell.level && !cellUnder.isOnMerge) {
                    if (cellUnder.animate.length === cell.animate.length) {
                      cellUnder.animate.push(['DELAY'])
                    }
                    cellUnder.animate.push(['LEVEL_UP']);
                    cellUnder.isOnMerge = true
                    cell.isOnMerge = true
                    cell.nextCoor = nextCoor;
                    cell.animate.push(['MOVE_TO', nextCoor, transformStrArr.map(i => i(moved))], ['DESTROY']);
                  } else {
                    if (moved > 1) {
                      cell.nextCoor = coor;
                      cell.animate.push(['MOVE_TO', coor, transformStrArr.map(i => i(moved - 1))]);
                    }
                  }
                  break
                }
              }
              coor = nextCoor;
            }

            if (moveableCoorParams.length) {
              let spliceIndexFix = 0;
              let showLog = []
              if (cell.isOnDivide) {
                let [movementIndex, moved0] = moveableCoorParams.pop();
                let [movementCoor] = lastMovement.splice(movementIndex, 1);
                movementCoor.length = 2;
                cell.animate.push(['DIVIDE', ['MOVE_TO', movementCoor, transformStrArr.map(i => i(moved0 - 1))]]);
                if (movementIndex < moveableCoorParams[0][0]) {
                  spliceIndexFix = -1;
                }
                showLog.push(movementCoor)
              }
              let [movementIndex, moved0] = moveableCoorParams.pop();
              let [movementCoor] = lastMovement.splice(movementIndex + spliceIndexFix, 1);
              movementCoor.length = 2;
              cell.nextCoor = movementCoor;
              cell.animate.push(['MOVE_TO', movementCoor, transformStrArr.map(i => i(moved0 - 1))])
              showLog.push(movementCoor)
            }

            if (!isMoved && cell.animate[0]) {
              isMoved = true
            }
          })
          allMovementPromse = list.map(c => {
            c.dom;
            return c.play()
          });
        }
        if (!isMoved) {
          clearTimeout(this.isOnError)
          this.proxy.isOnError = setTimeout(() => {
            this.proxy.isOnError = false
          }, 300);
          return Promise.resolve()
        } else {
          return Promise.all(allMovementPromse).then(() => {
            if (!lastMovement) {
              // 随机生成新个体
              let re_direction = this.RE_DIRECTION[this.DIRECTION.indexOf(direction)];
              let randomCoor = this.randomEmtyCoor(re_direction);
              randomCoor.push(undefined, this.addNewSilently)
              this.DEFAULT_CONFIG.autoAdd && new Cell(randomCoor, this);
              this.history.set(this.DIRECTION.indexOf(direction), this.cellMap.value)
            } else {
              this.banFinishNow = false
              this.history.refresh();
            }
            this.cellMap.log()
          })
        }
      })
      return this
    }
    finishNow() {
      this.addNewSilently = true;
      return Promise.all(this.cellMap.value.map(i => i.doneNow())).then(() => {
        setTimeout(() => {
          this.addNewSilently = false;
        }, this.DEFAULT_CONFIG.animateDuration);
      })
    }
    unmake() {
      if(this.banFinishNow){
        return
      }
      let lastMap = this.history.value[1];
      if (lastMap) {
        let params = JSON.parse(JSON.stringify(this.history.value[0]));
        if (params && params.length) {
          let [direction, ...propsArr] = params;
          switch (direction) {
            case 1:
              direction = 3;
              break;
            case 3:
              direction = 1;
              break;
            case 2:
              direction = 4;
              break;
            case 4:
              direction = 2;
              break;
            default:
              break;
          }
          let lastMapCoor = lastMap.filter((i, iNo) => iNo > 0)
          this.move(direction, propsArr, lastMapCoor)
          this.history.value.shift()
        }
      }
    }
    remake(isAsk = true) {
      let isOk = false;
      if (isAsk) {
        isOk = confirm('一二三四，再来一次？')
      } else {
        isOk = true
      }
      this.maxLevel = 1;
      this.history.reset();
      this.init()
    }
  }
  class Cell {
    constructor([x, y, level, isNotNew] = [], parent) {
      if (!Cell.prototype._id) { Cell.prototype._id = 1 };
      this.isNew = isNotNew !== true;
      this._id = ++Cell.prototype._id;
      this.$parent = parent;
      let styleDom = this.dom = D('span.cell-ts-wrap');
      let dom = styleDom.D('span.cell');
      let valueDom = dom.D('span.cell-inner');
      let cell = [
        ['level', valueDom, 'innerHTML', v => 2 ** v],
        ['level', dom, 'class', v => `lv_${v}`],
        ['isNew', dom, 'class', v => v ? 'is-new' : ''],
        ['levelUp', dom, 'class', v => v ? 'is-level-up' : ''],
        ['zIndex', styleDom, 'style', v => v && `z-index: ${v};` || ''],
        ['animateStyle', styleDom, 'style', v => v && v[0] && `transform: ${v.join(' ')}` || ''],
      ].reduce((cell, bindParams) => new BindDom(cell, ...bindParams), this)
      cell = new Proxy(cell, {
        set(target, key, value) {
          Reflect.set(target, key, value)
          if (key === 'coor') {
            value = new Proxy(value, {
              set(coor, coorIndex, coorValue) {
                Reflect.set(coor, coorIndex, coorValue);
                let [x0, y0] = coor;
                this.appendDom(x0, y0)
                return true
              }
            })
            cell.appendDom(target.coor)
          }
          return true
        }
      })

      if (x !== undefined && y !== undefined) {
        this.nextCoor = this.coor = [x, y];
      };
      cell.level = level === undefined ? R.int(1, 2) : level;
      parent.cellMap.add(cell)
      this.appendDom();
      setTimeout(() => {
        cell.isNew = false;
      }, 400);
      return cell
    }
    getIndex = (isOnMerge) => {
      let key = isOnMerge ? 'nextCoor' : 'coor'
      let [x, y] = this[key];
      return this.$parent.DEFAULT_CONFIG.mapSize * y + x;
    };
    _id = 0;
    level = 0;
    zIndex = undefined;
    dom = null;
    isNew = true;
    levelUp = false;
    isOnMerge = false;
    isOnAnimate = false;
    coor = [];
    animate = [];
    animateHandler = [];//[timeOutHandler, fn]
    playStatus = Promise.resolve();
    animateStyle = [];
    historyStatus = { isNew: true };
    appendDom([x, y] = this.coor, dom = this.dom, isRemove) {
      if (!dom || x === undefined || y === undefined) { return }
      let parent = this.$parent;
      let wrap = parent.container.children[this.getIndex()].querySelector('.cell-box')
      if (isRemove) {
        wrap.removeChild(this.dom)
      } else {
        wrap.appendChild(this.dom)
      }
    }
    play(count = 99, doneHandler) {
      if (this.isOnAnimate && !doneHandler) {
        return this.playStatus
      }
      this.isOnAnimate = true;
      if (!Number.isNaN(Number(count))) {
        count = Number(count) - 1;
        if (count <= 0) {
          this.isOnAnimate = false;
          doneHandler && doneHandler();
          return this.playStatus
        }
      }
      if (!doneHandler) {
        this.historyStatus = {}
      }
      let toDo = new Promise((done) => {
        let animate = this.animate[0];
        if (!animate) {
          done()
        }
        let method = typeof animate === 'string' ? animate : animate[0];
        switch (method) {
          case 'DELAY': {
            this.animate.shift();
            let finishFn = () => {
              if (this.animate[0]) {
                this.play(count, doneHandler || done)
              } else {
                done()
              }
            }
            this.animateHandler = [setTimeout(finishFn, this.$parent.DEFAULT_CONFIG.animateDuration + 19), finishFn]
          } break;
          case 'MOVE_TO': {
            this.animateStyle = animate[2];
            let finishFn = () => new Promise((fnDone) => {
              this.animateStyle = [];
              this.coor = animate[1];
              this.animate.shift();
              this.isOnMerge = false;
              setTimeout(() => {
                if (this.animate[0]) {
                  this.play(count, doneHandler || done)
                } else {
                  done()
                }
                fnDone();
              }, 20);
            })
            this.animateHandler = [setTimeout(finishFn, this.$parent.DEFAULT_CONFIG.animateDuration), finishFn]
          } break;
          case 'LEVEL_UP':
            this.level = this.level + 1;
            if (this.$parent.maxLevel > this.level) {
            } else {
              this.$parent.proxy.maxLevel = this.level
            }
            this.historyStatus.levelUp = true;
            clearTimeout(this.levelUp);
            this.levelUp = setTimeout(() => {
              this.levelUp = false
            }, 300);
            this.isOnMerge = false;
            this.animate.shift();
            done()
            break;
          case 'DESTROY':
            this.animate.shift();
            this.remove()
            done();
            break;
          case 'DIVIDE': {
            this.level = this.level - 1;
            let [x, y] = this.coor;
            let broCell = new Cell([x, y, this.level, true], this.$parent);
            broCell.nextCoor = animate[1][1]
            broCell.animate.push(animate[1])
            setTimeout(() => {
              broCell.play()
            }, 20);

            this.isOnDivide = false;
            this.animate.shift();
            if (this.animate[0]) {
              this.play(count, doneHandler || done)
            } else {
              done()
            }
          } break;

          default:
            done()
            break
        }
      }).then(() => {
        doneHandler && doneHandler()
        this.isOnAnimate = false;
      })
      return this.playStatus.then(() => toDo)
    }
    remove(removeDomOnly = false) {
      !removeDomOnly && this.$parent.cellMap.remove(this);
      this.$parent.container.children[this.getIndex()].querySelector('.cell-box').removeChild(this.dom)
    }
    doneNow() {
      let [timeOutHandler, fn] = this.animateHandler;
      timeOutHandler && clearTimeout(timeOutHandler);
      let re = fn && fn();
      return re instanceof Promise ? re : Promise.resolve()
    }
  }
  const BindDomUtil = {
    count: 1,
    map: {}
  }
  class BindDom {
    constructor(target, key, dome, attrName, valueFn) {
      if (target && key && dome && attrName) {
        this.el = dome;
        if (!dome._bId) {
          dome._bId = BindDomUtil.count++;
        }
        let bindKey = attrName + '_' + dome._bId;
        if (BindDomUtil.map[bindKey]) {
          BindDomUtil.map[bindKey].push([target, key, valueFn])
        } else {
          let orgValue = dome.getAttribute(attrName);
          BindDomUtil.map[bindKey] = [[[orgValue], 0], [target, key, valueFn]]
        }
        let proxy = new Proxy(target, {
          set: (t, k, v) => {
            if (k === 'isOnError') {
            }
            Reflect.set(t, k, v)
            if (k === key) {
              let valueList = BindDomUtil.map[bindKey].map(([dt, dk, vFn]) => vFn ? vFn(dt[dk]) : dt[dk])
              let attrValue = this.attrSetFillter(attrName, valueList)
              if (this.el[attrName] !== undefined) {
                this.el[attrName] = attrValue
              } else {
                this.el.setAttribute(attrName, attrValue)
              }
            }
            return true
          }
        })
        return proxy
      }
    }
    el = null;
    attrSetFillter(attrName, valueList) {
      switch (attrName.toUpperCase()) {
        case 'STYLE':
          return valueList.map(s => {
            if (!s) {
              return ''
            }
            if (typeof s === 'object') {
              return Object.entries(s).map(([k, v]) => {
                `${k.replace(/[A-Z]/g, kk => '-' + kk.toLowerCase()).replace(/^-/, '')}: ${v}`
              }).join(';') + ';'
            } else {
              return s.replace(/;$/, '') + ';'
            }
          }).join('');
        case 'CLASS':
          return valueList.map(s => {
            if (s instanceof Array) {
              return s.join(' ')
            } else if (typeof s === 'object') {
              return Object.entries(s).filter(([k, v]) => v).map(([k]) => k).join(';')
            } else {
              return s.replace(/;$/, '')
            }
          }).join(' ');
        default:
          return valueList[valueList.length - 1]
      }
    }
  }

  new Game2048("#box")
}
