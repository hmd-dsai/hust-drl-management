/** Hiện một thông báo ngắn ở đáy màn hình. `undo`: kèm nút Hoàn tác cho thao tác vừa làm. */
export type Notify = (message: string, opts?: { undo?: boolean }) => void
