export const defaultThemeId = 'violet';

export const colorThemes = [
  {
    id: 'violet',
    name: 'Binafsha',
    light: { primary: '#7157e8', primaryDark: '#5f45d2', primarySoft: '#f0edff' },
    dark: { primary: '#a695ff', primaryDark: '#907bf5', primarySoft: '#302a4e' },
  },
  {
    id: 'blue',
    name: 'Ko‘k',
    light: { primary: '#3978d4', primaryDark: '#2d62b3', primarySoft: '#eaf2ff' },
    dark: { primary: '#82b4ff', primaryDark: '#6497ee', primarySoft: '#1f3048' },
  },
  {
    id: 'teal',
    name: 'Moviy-yashil',
    light: { primary: '#168b91', primaryDark: '#107278', primarySoft: '#e5f6f5' },
    dark: { primary: '#55c5c6', primaryDark: '#37a9ae', primarySoft: '#19383b' },
  },
  {
    id: 'green',
    name: 'Yashil',
    light: { primary: '#26845a', primaryDark: '#1d6c48', primarySoft: '#e8f6ee' },
    dark: { primary: '#67cf98', primaryDark: '#42ad76', primarySoft: '#1d382b' },
  },
  {
    id: 'orange',
    name: 'To‘q sariq',
    light: { primary: '#c67a21', primaryDark: '#a66216', primarySoft: '#fff3e3' },
    dark: { primary: '#ffc16b', primaryDark: '#eaa64e', primarySoft: '#3b2d1d' },
  },
  {
    id: 'rose',
    name: 'Pushti',
    light: { primary: '#d04f79', primaryDark: '#b63d65', primarySoft: '#ffedf2' },
    dark: { primary: '#ff8eac', primaryDark: '#ed7195', primarySoft: '#402332' },
  },
  {
    id: 'indigo',
    name: 'Indigo',
    light: { primary: '#5965cf', primaryDark: '#4652b5', primarySoft: '#eceeff' },
    dark: { primary: '#9ba5ff', primaryDark: '#808df4', primarySoft: '#292d50' },
  },
];

export function getColorTheme(themeId) {
  return colorThemes.find((theme) => theme.id === themeId) || colorThemes[0];
}
