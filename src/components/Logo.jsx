// شعار التطبيق: العقاب السوري الذهبي (الهوية البصرية السورية الجديدة).
// لاستبداله بالملف الرسمي ضع الملف في public/syria-eagle.svg بالاسم نفسه.
export default function Logo({ size = 40, className = '' }) {
  return (
    <img
      src="/syria-eagle.svg"
      width={size}
      height={size}
      alt="شعار SyrAI — العقاب السوري"
      className={`logo ${className}`}
      draggable="false"
    />
  )
}
