/**
 * Host half of dsh-theme-stripe-style.
 *
 * 这是一个纯展示插件：没有 Host 状态、没有 Config、没有路由和存储。
 * 所有效果都在浏览器端（client.js）完成，主题偏好走 DSH 自带的主题服务
 * 和浏览器 localStorage。空的 apply() 只是为了满足 Cordis bundle 契约。
 */
export const name = 'dsh-theme-stripe-style'

export function apply() {}
