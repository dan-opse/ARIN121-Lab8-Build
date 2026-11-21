export interface SampleNote {
  title: string;
  category: string;
  content: string;
}

export const SAMPLE_NOTES: SampleNote[] = [
  {
    title: 'Cellular Respiration & ATP Synthesis',
    category: 'Biology 101',
    content: `Cellular respiration is a set of metabolic reactions that convert biochemical energy from nutrients into adenosine triphosphate (ATP). The process occurs in three main stages: glycolysis, the citric acid cycle (Krebs cycle), and oxidative phosphorylation.

1. Glycolysis takes place in the cytoplasm of the cell and does not require oxygen (anaerobic). It breaks down one molecule of glucose (6 carbons) into two molecules of pyruvate (3 carbons each), producing a net yield of 2 ATP and 2 NADH molecules.

2. The Citric Acid Cycle occurs in the mitochondrial matrix of eukaryotic cells and requires oxygen indirectly. Pyruvate is first converted into Acetyl-CoA before entering the cycle. Each turn of the cycle produces 1 ATP (or GTP), 3 NADH, 1 FADH2, and releases 2 CO2 molecules as waste.

3. Oxidative Phosphorylation is the final and highest ATP-yielding stage, taking place in the inner mitochondrial membrane. It consists of the electron transport chain (ETC) and chemiosmosis. Electrons from NADH and FADH2 are transferred through protein complexes (I to IV). Oxygen acts as the terminal electron acceptor, combining with protons to form water (H2O). The proton gradient established across the inner membrane drives ATP synthase to synthesize approximately 26 to 28 ATP molecules via chemiosmosis.`,
  },
  {
    title: 'Cognitive Biases & Decision Making',
    category: 'Psychology 200',
    content: `Cognitive biases are systematic patterns of deviation from norm or rationality in judgment. They often arise from heuristics—mental shortcuts used by the human brain to make rapid decisions.

Key Cognitive Biases:
- Confirmation Bias: The tendency to search for, interpret, favor, and recall information in a way that confirms one's preexisting beliefs or hypotheses, while ignoring contrary evidence.
- Availability Heuristic: Estimating the probability or frequency of an event based on how easily examples come to mind, heavily influenced by recent news or emotionally charged memories.
- Anchoring Bias: Relying too heavily on the first piece of information encountered (the "anchor") when making decisions, even if that anchor is completely arbitrary.
- Framing Effect: Drawing different conclusions from the same information depending on how the information is presented (e.g., "90% lean" versus "10% fat").
- Sunk Cost Fallacy: Continuing a behavior or endeavor as a result of previously invested resources (time, money, or effort), even when the current costs outweigh future benefits.`,
  },
  {
    title: 'Algorithmic Complexity & Big-O Notation',
    category: 'Computer Science 210',
    content: `Algorithmic complexity evaluates how the running time or memory usage of an algorithm grows as the input size (n) increases.

1. Constant Time - O(1): The execution time remains identical regardless of input size. Example: Accessing an array element by index or inserting into a hash map on average.
2. Logarithmic Time - O(log n): The problem size is halved in each step. Example: Binary search on a sorted array. Extremely efficient for huge datasets.
3. Linear Time - O(n): Execution time scales directly proportional to input size. Example: Iterating through an unsorted array to find an element.
4. Linearithmic Time - O(n log n): Common in efficient divide-and-conquer comparison sorting algorithms such as Merge Sort and QuickSort (average case).
5. Quadratic Time - O(n^2): Occurs with nested loops over the data. Example: Bubble Sort, Selection Sort, and Insertion Sort in the worst case.
6. Exponential Time - O(2^n): The execution time doubles with each additional element added to n. Example: Naive recursive calculation of Fibonacci numbers or exhaustive Traveling Salesperson Problem brute-force.`,
  },
];
