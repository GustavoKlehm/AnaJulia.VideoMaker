import { describe, expect, it } from 'vitest'
import { uniqueNames } from './downloadAll'

describe('uniqueNames', () => {
  it('mantém nomes únicos e numera os repetidos', () => {
    const items = [
      { id: '1', nome: 'IMG_0001.MOV', tamanho: 1 },
      { id: '2', nome: 'img_0001.mov', tamanho: 1 },
      { id: '3', nome: 'IMG_0002.MOV', tamanho: 1 },
      { id: '4', nome: 'IMG_0001.MOV', tamanho: 1 },
      { id: '5', nome: 'sem-extensao', tamanho: 1 },
      { id: '6', nome: 'sem-extensao', tamanho: 1 },
    ]
    expect(uniqueNames(items)).toEqual([
      'IMG_0001.MOV',
      'img_0001 (2).mov',
      'IMG_0002.MOV',
      'IMG_0001 (3).MOV',
      'sem-extensao',
      'sem-extensao (2)',
    ])
  })
})
