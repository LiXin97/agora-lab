import Handlebars from 'handlebars';

export function renderTemplate(templateStr: string, variables: Record<string, unknown>): string {
  const compiled = Handlebars.compile(templateStr, { noEscape: true });
  return compiled(variables);
}
