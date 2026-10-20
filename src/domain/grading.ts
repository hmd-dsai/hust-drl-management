// Xếp loại ĐRL theo tổng điểm. Ngưỡng là cấu hình: sửa ở đây nếu trường đổi.
// Mặc định theo quy chế đánh giá kết quả rèn luyện: ≥ 90 Xuất sắc, ≥ 80 Tốt, ≥ 65 Khá, ≥ 50 Trung bình, ≥ 35 Yếu, còn lại Kém.

export interface Grade {
  label: string
  /** Điểm tối thiểu (so sánh ≥). */
  min: number
}

/** Sắp theo `min` giảm dần; mức cuối có `min = 0`. */
export const GRADES: readonly Grade[] = [
  { label: 'Xuất sắc', min: 90 },
  { label: 'Tốt', min: 80 },
  { label: 'Khá', min: 65 },
  { label: 'Trung bình', min: 50 },
  { label: 'Yếu', min: 35 },
  { label: 'Kém', min: 0 },
]

export function gradeOf(score: number, grades: readonly Grade[] = GRADES): Grade {
  return grades.find((g) => score >= g.min) ?? grades[grades.length - 1]!
}

/** Mức ngay trên mức hiện tại và số điểm còn thiếu; `null` nếu đã ở mức cao nhất. */
export function nextGrade(score: number, grades: readonly Grade[] = GRADES): { grade: Grade; gap: number } | null {
  const i = grades.indexOf(gradeOf(score, grades))
  const up = grades[i - 1]
  return up ? { grade: up, gap: up.min - score } : null
}
