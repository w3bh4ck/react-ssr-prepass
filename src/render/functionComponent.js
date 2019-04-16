// @flow

import type { Node, ComponentType } from 'react'
import { computeProps } from '../element'

import type {
  Options,
  Hook,
  Frame,
  HooksFrame,
  DefaultProps,
  ComponentStatics,
  UserElement
} from '../types'

import {
  type Identity,
  maskContext,
  makeIdentity,
  setCurrentIdentity,
  getCurrentIdentity,
  setCurrentContextStore,
  getCurrentContextStore,
  setCurrentContextMap,
  getCurrentContextMap,
  renderWithHooks,
  setFirstHook,
  getFirstHook
} from '../internals'

const makeFrame = (
  type: ComponentType<DefaultProps> & ComponentStatics,
  props: DefaultProps,
  thenable: Promise<any>
) => ({
  contextMap: getCurrentContextMap(),
  contextStore: getCurrentContextStore(),
  id: getCurrentIdentity(),
  hook: getFirstHook(),
  kind: 'frame.hooks',
  thenable,
  props,
  type
})

const render = (
  type: ComponentType<DefaultProps> & ComponentStatics,
  props: DefaultProps,
  queue: Frame[]
): Node => {
  try {
    return renderWithHooks(
      type,
      computeProps(props, type.defaultProps),
      maskContext(type)
    )
  } catch (error) {
    if (typeof error.then !== 'function') {
      throw error
    }

    queue.push(makeFrame(type, props, error))
    return null
  } finally {
    setCurrentIdentity(null)
  }
}

/** Mount a function component */
export const mount = (
  type: ComponentType<DefaultProps> & ComponentStatics,
  props: DefaultProps,
  queue: Frame[],
  opts: Options,
  element?: UserElement
): Node => {
  setFirstHook(null)
  setCurrentIdentity(makeIdentity())

  if (element !== undefined) {
    const p = opts.visitor(element)
    if (typeof p === 'object' && p !== null && typeof p.then === 'function') {
      queue.push(makeFrame(type, props, p))
      return null
    }
  }

  return render(type, props, queue)
}

/** Update a previously suspended function component */
export const update = (queue: Frame[], frame: HooksFrame) => {
  setFirstHook(frame.hook)
  setCurrentIdentity(frame.id)
  setCurrentContextMap(frame.contextMap)
  setCurrentContextStore(frame.contextStore)
  return render(frame.type, frame.props, queue)
}
