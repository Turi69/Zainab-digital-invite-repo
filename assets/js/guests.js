/* ============================================================================
   Guest list
   ----------------------------------------------------------------------------
   This is the only file you need to edit to personalise the invitation.

   Each entry:
     names       every spelling or nickname that should let this guest in.
                 Matching ignores case, spacing and accents, so "ada obi",
                 "Ada  Obi" and "ADA OBI" all find the same entry.
     salutation  how they are addressed: "Dear ____,"
     message     their personal note, shown on the burgundy card.

   Leave `message` out and the guest sees the default note in index.html.
   ========================================================================== */

window.GUESTS = [
  {
    names: ['Turi', 'Turi Adeleke'],
    salutation: 'Turi',
    message:
      'You have heard every version of this story, including the ones we would rather ' +
      'forget, and you never once told us to hurry up. Come and see how it ends.',
  },
  {
    names: ['Ada', 'Ada Obi'],
    salutation: 'Ada',
    message:
      'You fed us through the worst month of the planning and refused to be thanked ' +
      'for it. We are thanking you anyway, in writing, where you cannot argue.',
  },
  {
    names: ['Emeka', 'Emeka Nwosu'],
    salutation: 'Emeka',
    message:
      'You have known Mmedaraobong since he was insufferable about football and ' +
      'nothing else. Thank you for staying through the whole of him.',
  },
  {
    names: ['Fatima', 'Fatima Bello'],
    salutation: 'Fatima',
    message:
      'You told Zainab to say yes before she had finished the sentence. You were right, ' +
      'and you will be unbearable about it in Uyo. We would not have it otherwise.',
  },
  {
    names: ['Mr and Mrs Ali', 'The Alis', 'Mummy and Daddy'],
    salutation: 'Mummy and Daddy',
    message:
      'Everything either of us knows about staying is something we watched you do. ' +
      'Thank you for the example, and for the patience while we caught up.',
  },
];
