import { useState, type FormEvent } from 'react';

interface Props {
  onClose: () => void;
  onCreate: (dto: { name: string }) => void;
}

export function CreateClientModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onCreate({ name });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Novo cliente</h2>
        <div>
          <label htmlFor="client-name" className="block text-sm text-gray-600">
            Nome
          </label>
          <input
            id="client-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
          >
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}
