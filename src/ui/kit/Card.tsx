import type { HTMLAttributes } from 'react'

type Tag = 'div' | 'section' | 'ul' | 'li' | 'dl'

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: Tag
  /** `none` khi nội dung tự lo khoảng đệm (danh sách có đường chia). */
  padding?: 'none' | 'sm' | 'md'
}

const PADDING = { none: '', sm: 'p-3', md: 'p-4' }

/** Khung viền mảnh bo `radius-lg`, nền trắng, không bóng. */
export function Card({ as: Tag = 'div', padding = 'md', className = '', ...rest }: CardProps) {
  return <Tag className={`rounded-lg border border-border bg-canvas ${PADDING[padding]} ${className}`} {...rest} />
}
