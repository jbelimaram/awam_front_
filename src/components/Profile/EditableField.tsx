interface EditableFieldProps {
  label: string;
  value: string;
  onEditClick: () => void;
}

export default function EditableField({ label, value, onEditClick }: EditableFieldProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#DDD2C2]">
      <div>
        <p className="text-xs text-[#968B78] font-medium">
  {label}
</p>

<p className="text-sm text-[#6F695B] font-medium">
  {value}
</p>
      </div>
      <button
        type="button"
        onClick={onEditClick}
        aria-label={`Modifier ${label}`}
        className="text-[#A8B89A] hover:text-[#D99B7C] transition p-2"
      >
        ✏️
      </button>
    </div>
  );
}