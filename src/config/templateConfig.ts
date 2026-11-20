export type Gender = 'male' | 'female'
export type Shape = 'ellipse' | 'rect'

/** Toạ độ theo TỈ LỆ (0..1) so với kích thước ảnh template. cx,cy = tâm; w,h = đường kính/kích thước. */
export interface Slot {
  id: string;
  label: string;
  shape: Shape;
  cx: number;
  cy: number;
  w: number;
  h: number;
  required?: boolean
  defaultImage?: string // đường dẫn ảnh mặc định (relative to public/)
}
export interface TemplateConfig { id: Gender; src: string; slots: Slot[] }

// ⚠️ TOẠ ĐỘ ƯỚC LƯỢNG bằng mắt từ ảnh. Mở web với ?debug=1 để xem khung và chỉnh lại số cho khớp.
export const TEMPLATES: Record<Gender, TemplateConfig> = {
  male: {
    id: 'male', src: 'templates/male.webp', // 1024×765
    slots: [
      { id: 'partner', label: 'Bạn', shape: 'ellipse', cx: 0.76, cy: 0.58, w: 0.16, h: 0.19, required: true },
      { id: 'ng_tot_nghiep', label: 'Thẻo', shape: 'ellipse', cx: 0.26, cy: 0.56, w: 0.17, h: 0.20, defaultImage: 'images/ng_tot_nghiep.jpg' },
      { id: 'bang_tot_nghiep', label: 'Ảnh bằng', shape: 'rect', cx: 0.5103, cy: 0.5725, w: 0.1475, h: 0.2902, defaultImage: 'images/bang_tot_nghiep.jpg' },
    ],
  },
  female: {
    id: 'female', src: 'templates/female.webp', // 1024×1024
    slots: [
      { id: 'partner', label: 'Bạn', shape: 'ellipse', cx: 0.79, cy: 0.59, w: 0.18, h: 0.15, required: true },
      { id: 'ng_tot_nghiep', label: 'Thẻo', shape: 'ellipse', cx: 0.25, cy: 0.565, w: 0.19, h: 0.18, defaultImage: 'images/ng_tot_nghiep.jpg' },
      { id: 'bang_tot_nghiep', label: 'Ảnh bằng', shape: 'rect', cx: 0.5205, cy: 0.5635, w: 0.1563, h: 0.2451, defaultImage: 'images/bang_tot_nghiep.jpg' },
    ],
  },
}
