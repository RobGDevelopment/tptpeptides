'use client';

import { useEffect, useState } from 'react';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { MetallicBeam } from '../../../components/ui/MetallicBeam';
import type { AdminProductGroup } from '../types';

const numberField = (schema: z.ZodNumber) =>
  z.preprocess((value) => (value === '' || value == null ? undefined : Number(value)), schema);

const variantFormSchema = z.object({
  id: z.string().min(1),
  tag: z.string().min(1),
  price: numberField(z.number().positive()),
  baseCost: z.preprocess(
    (value) => (value === '' || value == null ? null : Number(value)),
    z.number().nullable().optional()
  ),
  stock: numberField(z.number().int().min(0)),
  active: z.boolean(),
  reorderThreshold: numberField(z.number().int().min(0)).default(20),
  storefrontBadge: z.enum(['none', 'new_batch']).default('none'),
  activeFrom: z.string().optional(),
  activeUntil: z.string().optional(),
});

const productFormSchema = z.object({
  catalogId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  desc: z.string().min(1),
  researchAreas: z.string(),
  variants: z.array(variantFormSchema).min(1),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGroup: AdminProductGroup | null;
}

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function ProductFormModal({ isOpen, onClose, initialGroup }: ProductFormModalProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as Resolver<ProductFormValues>,
    defaultValues: {
      catalogId: '',
      name: '',
      category: '',
      desc: '',
      researchAreas: '',
      variants: [
        {
          id: '',
          tag: '',
          price: 1,
          baseCost: null,
          stock: 0,
          active: true,
          reorderThreshold: 20,
          storefrontBadge: 'none',
          activeFrom: '',
          activeUntil: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
  const [saveError, setSaveError] = useState('');
  const watchedName = watch('name');

  useEffect(() => {
    if (!isOpen) return;

    if (initialGroup) {
      reset({
        catalogId: initialGroup.catalogId,
        name: initialGroup.name,
        category: initialGroup.category,
        desc: initialGroup.desc,
        researchAreas: initialGroup.researchAreas.join(', '),
        variants: initialGroup.variants.map((variant) => ({
          id: variant.id,
          tag: variant.tag,
          price: variant.price,
          baseCost: variant.baseCost,
          stock: variant.stock,
          active: variant.active,
          reorderThreshold: variant.reorderThreshold,
          storefrontBadge: variant.storefrontBadge,
          activeFrom: toDatetimeLocal(variant.activeFrom),
          activeUntil: toDatetimeLocal(variant.activeUntil),
        })),
      });
      return;
    }

    reset({
      catalogId: '',
      name: '',
      category: '',
      desc: '',
      researchAreas: '',
      variants: [
        {
          id: '',
          tag: '',
          price: 1,
          baseCost: null,
          stock: 0,
          active: true,
          reorderThreshold: 20,
          storefrontBadge: 'none',
          activeFrom: '',
          activeUntil: '',
        },
      ],
    });
  }, [isOpen, initialGroup, reset]);

  useEffect(() => {
    if (initialGroup || !watchedName) return;
    setValue('catalogId', slugify(watchedName));
  }, [watchedName, initialGroup, setValue]);

  const onSubmit = async (values: ProductFormValues) => {
    setSaveError('');
    const payload = {
      ...values,
      catalogId: values.catalogId || slugify(values.name),
      researchAreas: values.researchAreas
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      variants: values.variants.map((variant, index) => ({
        ...variant,
        id:
          variant.id ||
          `${slugify(values.name)}-${slugify(variant.tag) || String(index + 1)}`,
        baseCost: variant.baseCost ?? null,
        activeFrom: toIsoOrNull(variant.activeFrom),
        activeUntil: toIsoOrNull(variant.activeUntil),
      })),
    };

    const response = await fetch('/api/admin/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setSaveError(data.error ?? 'Failed to save product');
      return;
    }

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} panelClassName="max-w-3xl max-h-[90vh] overflow-y-auto">
      <h2 className="text-sm tracking-caps uppercase text-primary font-medium mb-6">
        {initialGroup ? 'Edit Product' : 'Add Product'}
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid sm:grid-cols-2 gap-6">
          <Input label="Product Name" {...register('name')} />
          <Input label="Category" {...register('category')} />
        </div>
        <Input label="Catalog ID" {...register('catalogId')} />
        <div>
          <label className="text-[10px] tracking-caps uppercase text-muted block mb-2">Description</label>
          <textarea
            {...register('desc')}
            rows={3}
            className="terminal-input resize-none"
          />
          <p className="text-xs text-muted mt-2 font-light">
            Descriptions must end with the RUO suffix and avoid therapeutic or dosing language.
          </p>
        </div>
        <Input label="Research Areas (comma-separated)" {...register('researchAreas')} />

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] tracking-caps uppercase text-muted">Variants</h3>
            <button
              type="button"
              onClick={() =>
                append({
                  id: '',
                  tag: '',
                  price: 1,
                  baseCost: null,
                  stock: 0,
                  active: true,
                  reorderThreshold: 20,
                  storefrontBadge: 'none',
                  activeFrom: '',
                  activeUntil: '',
                })
              }
              className="terminal-link text-[10px]"
            >
              Add Variant
            </button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="border-b border-white/[0.06] pb-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Dose / Tag" {...register(`variants.${index}.tag`)} />
                <Input label="Variant ID" {...register(`variants.${index}.id`)} />
                <Input label="Retail Price" type="number" step="0.01" {...register(`variants.${index}.price`)} />
                <Input label="Base Cost" type="number" step="0.01" {...register(`variants.${index}.baseCost`)} />
                <Input label="Stock" type="number" {...register(`variants.${index}.stock`)} />
                <Input
                  label="Reorder Threshold"
                  type="number"
                  {...register(`variants.${index}.reorderThreshold`)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-secondary font-light">
                <input type="checkbox" {...register(`variants.${index}.active`)} className="accent-gold" />
                Active on storefront
              </label>
              <label className="block">
                <span className="text-[10px] tracking-caps uppercase text-muted block mb-2">Storefront badge</span>
                <select {...register(`variants.${index}.storefrontBadge`)} className="terminal-select">
                  <option value="none">None</option>
                  <option value="new_batch">New Batch</option>
                </select>
              </label>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Visible from (optional)"
                  type="datetime-local"
                  {...register(`variants.${index}.activeFrom`)}
                />
                <Input
                  label="Visible until (optional)"
                  type="datetime-local"
                  {...register(`variants.${index}.activeUntil`)}
                />
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-[10px] tracking-caps uppercase text-muted hover:text-secondary"
                >
                  Remove variant
                </button>
              )}
            </div>
          ))}
        </div>

        {saveError && <p className="text-red-400/90 text-sm">{saveError}</p>}

        <MetallicBeam variant="horizontal" animated={false} />
        <div className="flex gap-6 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Product'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
