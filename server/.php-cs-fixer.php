<?php

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__ . '/app');

return (new PhpCsFixer\Config())
    ->setRules([
        '@PHP82Migration'                   => true,
        '@PSR12'                            => true,
        'align_multiline_comment'           => true,
        'array_indentation'                 => true,
        'array_syntax'                      => ['syntax' => 'short'],
        'binary_operator_spaces'            => ['default' => 'align_single_space_minimal'],
        'blank_line_before_statement'       => ['statements' => ['return', 'throw', 'if', 'foreach', 'for', 'while']],
        'cast_spaces'                       => ['space' => 'single'],
        'concat_space'                      => ['spacing' => 'one'],
        'method_chaining_indentation'       => true,
        'no_unused_imports'                 => true,
        'ordered_imports'                   => ['sort_algorithm' => 'alpha'],
        'single_quote'                      => true,
        'trailing_comma_in_multiline'       => true,
    ])
    ->setFinder($finder);
