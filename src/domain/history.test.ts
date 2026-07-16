import { emptyProjectHistory, MAX_HISTORY_ENTRIES, normalizeProjectHistory, projectContentsEqual, recordProjectChange, redoProject, snapshotProject, undoProject } from './history'
import type { Project, ProjectHistory } from '../types'

function project(title: string, id = 'project-1'): Project {
  return {
    id,
    title,
    status: '未着手',
    source: 'Hello',
    translations: [{ id: 'translation-1', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' }],
    updatedAt: '2026-07-16T01:00:00.000Z',
  }
}

describe('project history', () => {
  test('records the previous state before a change', () => {
    const result = recordProjectChange(project('A'), project('B'), emptyProjectHistory())
    expect(result.history.past).toEqual([snapshotProject(project('A'))])
    expect(result.project.title).toBe('B')
  })

  test('undoes and redoes a project change', () => {
    const changed = recordProjectChange(project('A'), project('B'), emptyProjectHistory())
    const undone = undoProject(changed.project, changed.history)
    expect(undone?.project.title).toBe('A')
    expect(undone?.project.id).toBe('project-1')

    const redone = undone && redoProject(undone.project, undone.history)
    expect(redone?.project.title).toBe('B')
  })

  test('clears future states when recording a branch after undo', () => {
    const changed = recordProjectChange(project('A'), project('B'), emptyProjectHistory())
    const undone = undoProject(changed.project, changed.history) as NonNullable<ReturnType<typeof undoProject>>
    const branched = recordProjectChange(undone.project, project('D'), undone.history)
    expect(branched.history.future).toEqual([])
    expect(redoProject(branched.project, branched.history)).toBeNull()
  })

  test('keeps at most 25 entries and removes the oldest first', () => {
    let current = project('0')
    let history = emptyProjectHistory()
    for (let index = 1; index <= MAX_HISTORY_ENTRIES + 2; index += 1) {
      const result = recordProjectChange(current, project(String(index)), history)
      current = result.project
      history = result.history
    }
    expect(history.past).toHaveLength(MAX_HISTORY_ENTRIES)
    expect(history.past[0].title).toBe('2')
  })

  test('limits combined past and future entries to 25', () => {
    const history = normalizeProjectHistory({
      past: Array.from({ length: 20 }, (_, index) => snapshotProject(project(`past-${index}`))),
      future: Array.from({ length: 10 }, (_, index) => snapshotProject(project(`future-${index}`))),
    })
    expect(history.past).toHaveLength(15)
    expect(history.future).toHaveLength(10)
    expect(history.past[0].title).toBe('past-5')
  })

  test('histories remain independent for each project', () => {
    const histories: Record<string, ProjectHistory> = {
      one: recordProjectChange(project('A', 'one'), project('B', 'one'), emptyProjectHistory()).history,
      two: emptyProjectHistory(),
    }
    expect(histories.one.past).toHaveLength(1)
    expect(histories.two.past).toHaveLength(0)
  })

  test('snapshots and restored projects do not share translation references', () => {
    const original = project('A')
    const changed = recordProjectChange(original, project('B'), emptyProjectHistory())
    original.translations[0].translated = '変更'
    changed.project.translations[0].translated = '別の変更'
    expect(changed.history.past[0].translations[0].translated).toBe('こんにちは')
  })

  test('does not add history when project contents are unchanged', () => {
    const current = project('A')
    const result = recordProjectChange(current, { ...current, translations: current.translations.map((item) => ({ ...item })) }, emptyProjectHistory())
    expect(result.history).toEqual(emptyProjectHistory())
    expect(projectContentsEqual(result.project, current)).toBe(true)
  })
})
